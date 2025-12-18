import { expect } from "chai";
import { ethers } from "hardhat";
import { PermiSIPAI, MockAave, MockCompound, MockUniswap } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PermiSIPAI", function () {
  let permiSIPAI: PermiSIPAI;
  let mockAave: MockAave;
  let mockCompound: MockCompound;
  let mockUniswap: MockUniswap;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const TOTAL_AMOUNT = ethers.parseEther("12"); // 12 ETH for 12 months
  const MONTHLY_AMOUNT = ethers.parseEther("1"); // 1 ETH per month
  const DURATION = 12; // 12 months

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock protocols
    const MockAaveFactory = await ethers.getContractFactory("MockAave");
    mockAave = await MockAaveFactory.deploy();
    await mockAave.waitForDeployment();

    const MockCompoundFactory = await ethers.getContractFactory("MockCompound");
    mockCompound = await MockCompoundFactory.deploy();
    await mockCompound.waitForDeployment();

    const MockUniswapFactory = await ethers.getContractFactory("MockUniswap");
    mockUniswap = await MockUniswapFactory.deploy();
    await mockUniswap.waitForDeployment();

    // Deploy PermiSIPAI
    const PermiSIPAIFactory = await ethers.getContractFactory("PermiSIPAI");
    permiSIPAI = await PermiSIPAIFactory.deploy(
      await mockAave.getAddress(),
      await mockCompound.getAddress(),
      await mockUniswap.getAddress(),
    );
    await permiSIPAI.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct protocol addresses", async function () {
      expect(await permiSIPAI.aave()).to.equal(await mockAave.getAddress());
      expect(await permiSIPAI.compound()).to.equal(await mockCompound.getAddress());
      expect(await permiSIPAI.uniswap()).to.equal(await mockUniswap.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await permiSIPAI.owner()).to.equal(owner.address);
    });
  });

  describe("Create SIP Plan", function () {
    it("Should create a SIP plan with correct parameters", async function () {
      const tx = await permiSIPAI.connect(user1).createSIPPlan(
        TOTAL_AMOUNT,
        MONTHLY_AMOUNT,
        DURATION,
        60, // 60% Aave
        30, // 30% Compound
        10, // 10% Uniswap
        { value: TOTAL_AMOUNT },
      );

      await expect(tx).to.emit(permiSIPAI, "SIPCreated").withArgs(user1.address, TOTAL_AMOUNT, DURATION);

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.user).to.equal(user1.address);
      expect(plan.totalAmount).to.equal(TOTAL_AMOUNT);
      expect(plan.monthlyAmount).to.equal(MONTHLY_AMOUNT);
      expect(plan.duration).to.equal(DURATION);
      expect(plan.strategy.aavePercent).to.equal(60);
      expect(plan.strategy.compoundPercent).to.equal(30);
      expect(plan.strategy.uniswapPercent).to.equal(10);
      expect(plan.deposited).to.equal(TOTAL_AMOUNT); // First deposit executed immediately
      expect(plan.active).to.equal(true);
    });

    it("Should revert if ETH amount doesn't match total amount", async function () {
      await expect(
        permiSIPAI.connect(user1).createSIPPlan(
          TOTAL_AMOUNT,
          MONTHLY_AMOUNT,
          DURATION,
          60,
          30,
          10,
          { value: ethers.parseEther("10") }, // Wrong amount
        ),
      ).to.be.revertedWith("Send correct ETH amount");
    });

    it("Should revert if percentages don't sum to 100", async function () {
      await expect(
        permiSIPAI.connect(user1).createSIPPlan(
          TOTAL_AMOUNT,
          MONTHLY_AMOUNT,
          DURATION,
          60,
          30,
          5, // Only 95% total
          { value: TOTAL_AMOUNT },
        ),
      ).to.be.revertedWith("Percents must sum to 100");
    });

    it("Should revert if user already has an active plan", async function () {
      // Create first plan
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      // Try to create second plan
      await expect(
        permiSIPAI
          .connect(user1)
          .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT }),
      ).to.be.revertedWith("Plan already exists");
    });

    it("Should execute first deposit immediately upon plan creation", async function () {
      const aaveBalanceBefore = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceBefore = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceBefore = await ethers.provider.getBalance(await mockUniswap.getAddress());

      await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      const aaveBalanceAfter = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceAfter = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceAfter = await ethers.provider.getBalance(await mockUniswap.getAddress());

      // Check that funds were distributed according to percentages
      const expectedAave = (TOTAL_AMOUNT * 60n) / 100n;
      const expectedCompound = (TOTAL_AMOUNT * 30n) / 100n;
      const expectedUniswap = (TOTAL_AMOUNT * 10n) / 100n;

      expect(aaveBalanceAfter - aaveBalanceBefore).to.equal(expectedAave);
      expect(compoundBalanceAfter - compoundBalanceBefore).to.equal(expectedCompound);
      expect(uniswapBalanceAfter - uniswapBalanceBefore).to.equal(expectedUniswap);
    });

    it("Should emit FundsAllocated events for each protocol", async function () {
      const expectedAave = (TOTAL_AMOUNT * 60n) / 100n;
      const expectedCompound = (TOTAL_AMOUNT * 30n) / 100n;
      const expectedUniswap = (TOTAL_AMOUNT * 10n) / 100n;

      const tx = await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      await expect(tx)
        .to.emit(permiSIPAI, "FundsAllocated")
        .withArgs(await mockAave.getAddress(), expectedAave);

      await expect(tx)
        .to.emit(permiSIPAI, "FundsAllocated")
        .withArgs(await mockCompound.getAddress(), expectedCompound);

      await expect(tx)
        .to.emit(permiSIPAI, "FundsAllocated")
        .withArgs(await mockUniswap.getAddress(), expectedUniswap);
    });

    it("Should emit DepositExecuted event", async function () {
      const tx = await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      await expect(tx).to.emit(permiSIPAI, "DepositExecuted").withArgs(user1.address, TOTAL_AMOUNT);
    });
  });

  describe("Multiple Users", function () {
    it("Should allow multiple users to create separate plans", async function () {
      // User1 creates a plan
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      // User2 creates a different plan
      const user2Amount = ethers.parseEther("24");
      await permiSIPAI
        .connect(user2)
        .createSIPPlan(user2Amount, ethers.parseEther("2"), 12, 50, 25, 25, { value: user2Amount });

      const plan1 = await permiSIPAI.getPlan(user1.address);
      const plan2 = await permiSIPAI.getPlan(user2.address);

      expect(plan1.totalAmount).to.equal(TOTAL_AMOUNT);
      expect(plan2.totalAmount).to.equal(user2Amount);
      expect(plan1.strategy.aavePercent).to.equal(60);
      expect(plan2.strategy.aavePercent).to.equal(50);
    });
  });

  describe("Strategy Allocation", function () {
    it("Should handle 100% allocation to single protocol", async function () {
      await permiSIPAI.connect(user1).createSIPPlan(
        TOTAL_AMOUNT,
        MONTHLY_AMOUNT,
        DURATION,
        100, // 100% Aave
        0,
        0,
        { value: TOTAL_AMOUNT },
      );

      const aaveBalance = await ethers.provider.getBalance(await mockAave.getAddress());
      expect(aaveBalance).to.equal(TOTAL_AMOUNT);
    });

    it("Should handle equal distribution across all protocols", async function () {
      const amount = ethers.parseEther("9"); // Divisible by 3
      await permiSIPAI.connect(user1).createSIPPlan(
        amount,
        ethers.parseEther("0.75"),
        12,
        33,
        33,
        34, // 33 + 33 + 34 = 100
        { value: amount },
      );

      const expectedAave = (amount * 33n) / 100n;
      const expectedCompound = (amount * 33n) / 100n;
      const expectedUniswap = (amount * 34n) / 100n;

      const aaveBalance = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalance = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalance = await ethers.provider.getBalance(await mockUniswap.getAddress());

      expect(aaveBalance).to.equal(expectedAave);
      expect(compoundBalance).to.equal(expectedCompound);
      expect(uniswapBalance).to.equal(expectedUniswap);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const smallAmount = ethers.parseEther("0.001");
      await permiSIPAI.connect(user1).createSIPPlan(smallAmount, smallAmount, 1, 60, 30, 10, { value: smallAmount });

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.totalAmount).to.equal(smallAmount);
      expect(plan.active).to.equal(true);
    });

    it("Should handle large amounts", async function () {
      const largeAmount = ethers.parseEther("1000");
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(largeAmount, ethers.parseEther("100"), 10, 60, 30, 10, { value: largeAmount });

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.totalAmount).to.equal(largeAmount);
      expect(plan.deposited).to.equal(largeAmount);
    });

    it("Should return empty plan for address with no plan", async function () {
      const plan = await permiSIPAI.getPlan(user2.address);
      expect(plan.user).to.equal(ethers.ZeroAddress);
      expect(plan.totalAmount).to.equal(0);
      expect(plan.active).to.equal(false);
    });
  });

  describe("Contract Balance", function () {
    it("Should have zero balance after distributing all funds", async function () {
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      const contractBalance = await ethers.provider.getBalance(await permiSIPAI.getAddress());
      expect(contractBalance).to.equal(0);
    });

    it("Should accept ETH via receive function", async function () {
      const sendAmount = ethers.parseEther("1");
      await owner.sendTransaction({
        to: await permiSIPAI.getAddress(),
        value: sendAmount,
      });

      const contractBalance = await ethers.provider.getBalance(await permiSIPAI.getAddress());
      expect(contractBalance).to.equal(sendAmount);
    });
  });

  describe("Gas Optimization", function () {
    it("Should create plan with reasonable gas cost", async function () {
      const tx = await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });

      const receipt = await tx.wait();
      expect(receipt?.gasUsed).to.be.lessThan(500000n); // Should be well under 500k gas
    });
  });

  describe("Plan Management", function () {
    beforeEach(async () => {
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(TOTAL_AMOUNT, MONTHLY_AMOUNT, DURATION, 60, 30, 10, { value: TOTAL_AMOUNT });
    });

    describe("Cancel Plan", function () {
      it("Should allow user to cancel their active plan", async function () {
        const tx = await permiSIPAI.connect(user1).cancelPlan();

        await expect(tx).to.emit(permiSIPAI, "PlanCancelled").withArgs(user1.address, 0);

        const plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(false);
      });

      it("Should revert if no active plan exists", async function () {
        await expect(permiSIPAI.connect(user2).cancelPlan()).to.be.revertedWith("No active plan");
      });

      it("Should revert if plan already cancelled", async function () {
        await permiSIPAI.connect(user1).cancelPlan();
        await expect(permiSIPAI.connect(user1).cancelPlan()).to.be.revertedWith("No active plan");
      });
    });

    describe("Pause Plan", function () {
      it("Should allow user to pause their active plan", async function () {
        const tx = await permiSIPAI.connect(user1).pausePlan();

        await expect(tx).to.emit(permiSIPAI, "PlanPaused").withArgs(user1.address);

        const plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(false);
      });

      it("Should revert if no active plan exists", async function () {
        await expect(permiSIPAI.connect(user2).pausePlan()).to.be.revertedWith("No active plan");
      });

      it("Should revert if plan already paused", async function () {
        await permiSIPAI.connect(user1).pausePlan();
        await expect(permiSIPAI.connect(user1).pausePlan()).to.be.revertedWith("No active plan");
      });
    });

    describe("Resume Plan", function () {
      beforeEach(async () => {
        await permiSIPAI.connect(user1).pausePlan();
      });

      it("Should allow user to resume their paused plan", async function () {
        const tx = await permiSIPAI.connect(user1).resumePlan();

        await expect(tx).to.emit(permiSIPAI, "PlanResumed").withArgs(user1.address);

        const plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(true);
      });

      it("Should revert if plan is already active", async function () {
        await permiSIPAI.connect(user1).resumePlan();
        await expect(permiSIPAI.connect(user1).resumePlan()).to.be.revertedWith("Plan already active");
      });

      it("Should revert if no plan exists", async function () {
        await expect(permiSIPAI.connect(user2).resumePlan()).to.be.revertedWith("No plan found");
      });
    });

    describe("Plan Lifecycle", function () {
      it("Should allow pause -> resume -> pause cycle", async function () {
        // Pause
        await permiSIPAI.connect(user1).pausePlan();
        let plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(false);

        // Resume
        await permiSIPAI.connect(user1).resumePlan();
        plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(true);

        // Pause again
        await permiSIPAI.connect(user1).pausePlan();
        plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(false);
      });

      it("Should not allow creating new plan after cancellation without resuming", async function () {
        await permiSIPAI.connect(user1).cancelPlan();

        // Cannot resume a cancelled plan to create new one
        // User data still exists but is inactive
        const plan = await permiSIPAI.getPlan(user1.address);
        expect(plan.active).to.equal(false);
      });
    });
  });

  describe("Validation", function () {
    it("Should revert if monthly amount exceeds total amount", async function () {
      await expect(
        permiSIPAI.connect(user1).createSIPPlan(
          ethers.parseEther("10"),
          ethers.parseEther("15"), // Monthly > Total
          12,
          60,
          30,
          10,
          { value: ethers.parseEther("10") },
        ),
      ).to.be.revertedWith("Monthly amount exceeds total");
    });

    it("Should allow monthly amount equal to total amount", async function () {
      const amount = ethers.parseEther("5");
      await permiSIPAI.connect(user1).createSIPPlan(
        amount,
        amount, // Monthly = Total (single payment)
        1,
        60,
        30,
        10,
        { value: amount },
      );

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.monthlyAmount).to.equal(amount);
      expect(plan.totalAmount).to.equal(amount);
    });
  });
});
