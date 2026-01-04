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

  // ============================================
  // LEGACY TESTS - Backward Compatibility
  // ============================================
  describe("Legacy: Create SIP Plan", function () {
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

      await expect(tx).to.emit(permiSIPAI, "LegacySIPCreated").withArgs(user1.address, TOTAL_AMOUNT, DURATION);

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.user).to.equal(user1.address);
      expect(plan.monthlyAmount).to.equal(MONTHLY_AMOUNT);
      expect(plan.strategy.aavePercent).to.equal(60);
      expect(plan.strategy.compoundPercent).to.equal(30);
      expect(plan.strategy.uniswapPercent).to.equal(10);
      expect(plan.totalDeposited).to.equal(TOTAL_AMOUNT); // First deposit executed immediately
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

      await expect(tx).to.emit(permiSIPAI, "DepositExecuted").withArgs(user1.address, 0, TOTAL_AMOUNT);
    });
  });

  // ============================================
  // NEW MULTI-PLAN TESTS
  // ============================================
  describe("Multi-Plan: Create SIP Plan with ID", function () {
    it("Should create a SIP plan with plan ID", async function () {
      const planId = 1;
      const monthlyAmount = ethers.parseUnits("100", 6); // 100 USDC

      const tx = await permiSIPAI.connect(user1).createSIPPlanWithId(
        planId,
        monthlyAmount,
        50, // 50% Aave
        30, // 30% Compound
        20, // 20% Uniswap
        true, // Enable rebalancing
      );

      await expect(tx).to.emit(permiSIPAI, "SIPCreated").withArgs(user1.address, planId, monthlyAmount);

      const plan = await permiSIPAI.getPlanById(user1.address, planId);
      expect(plan.user).to.equal(user1.address);
      expect(plan.planId).to.equal(planId);
      expect(plan.monthlyAmount).to.equal(monthlyAmount);
      expect(plan.strategy.aavePercent).to.equal(50);
      expect(plan.strategy.compoundPercent).to.equal(30);
      expect(plan.strategy.uniswapPercent).to.equal(20);
      expect(plan.active).to.equal(true);
      expect(plan.rebalancingEnabled).to.equal(true);
    });

    it("Should create a SIP plan without rebalancing", async function () {
      const planId = 2;
      const monthlyAmount = ethers.parseUnits("50", 6);

      await permiSIPAI.connect(user1).createSIPPlanWithId(planId, monthlyAmount, 40, 40, 20, false);

      const plan = await permiSIPAI.getPlanById(user1.address, planId);
      expect(plan.rebalancingEnabled).to.equal(false);
    });

    it("Should allow user to have multiple plans with different IDs", async function () {
      // Create plan 1
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);

      // Create plan 2
      await permiSIPAI.connect(user1).createSIPPlanWithId(2, ethers.parseUnits("200", 6), 50, 25, 25, false);

      const plan1 = await permiSIPAI.getPlanById(user1.address, 1);
      const plan2 = await permiSIPAI.getPlanById(user1.address, 2);

      expect(plan1.monthlyAmount).to.equal(ethers.parseUnits("100", 6));
      expect(plan2.monthlyAmount).to.equal(ethers.parseUnits("200", 6));
      expect(plan1.rebalancingEnabled).to.equal(true);
      expect(plan2.rebalancingEnabled).to.equal(false);

      const planIds = await permiSIPAI.getUserPlanIds(user1.address);
      expect(planIds.length).to.equal(2);
      expect(planIds[0]).to.equal(1);
      expect(planIds[1]).to.equal(2);
    });

    it("Should revert if plan ID already exists", async function () {
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);

      await expect(
        permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("200", 6), 50, 25, 25, false),
      ).to.be.revertedWith("Plan already exists");
    });

    it("Should revert if monthly amount is 0", async function () {
      await expect(permiSIPAI.connect(user1).createSIPPlanWithId(1, 0, 60, 30, 10, true)).to.be.revertedWith(
        "Monthly amount must be greater than 0",
      );
    });
  });

  // ============================================
  // REBALANCING TESTS
  // ============================================
  describe("Rebalancing", function () {
    beforeEach(async () => {
      // Create a plan with rebalancing enabled
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);
    });

    it("Should allow owner to rebalance a user's plan", async function () {
      const tx = await permiSIPAI.connect(owner).rebalance(
        user1.address,
        1, // planId
        40, // New Aave %
        35, // New Compound %
        25, // New Uniswap %
      );

      await expect(tx).to.emit(permiSIPAI, "PlanRebalanced").withArgs(user1.address, 1, 40, 35, 25);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.strategy.aavePercent).to.equal(40);
      expect(plan.strategy.compoundPercent).to.equal(35);
      expect(plan.strategy.uniswapPercent).to.equal(25);
    });

    it("Should revert if non-owner tries to rebalance", async function () {
      await expect(permiSIPAI.connect(user2).rebalance(user1.address, 1, 40, 35, 25)).to.be.revertedWith("Only owner");
    });

    it("Should revert if plan is not active", async function () {
      await permiSIPAI.connect(user1).pausePlanById(1);

      await expect(permiSIPAI.connect(owner).rebalance(user1.address, 1, 40, 35, 25)).to.be.revertedWith(
        "No active plan",
      );
    });

    it("Should revert if rebalancing is not enabled", async function () {
      // Create a plan without rebalancing
      await permiSIPAI.connect(user1).createSIPPlanWithId(2, ethers.parseUnits("100", 6), 60, 30, 10, false);

      await expect(permiSIPAI.connect(owner).rebalance(user1.address, 2, 40, 35, 25)).to.be.revertedWith(
        "Rebalancing not enabled",
      );
    });

    it("Should revert if new percentages don't sum to 100", async function () {
      await expect(permiSIPAI.connect(owner).rebalance(user1.address, 1, 40, 35, 20)).to.be.revertedWith(
        "Percents must sum to 100",
      );
    });

    it("Should allow user to toggle rebalancing", async function () {
      // Initially enabled
      let plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.rebalancingEnabled).to.equal(true);

      // Disable
      await permiSIPAI.connect(user1).setRebalancing(1, false);
      plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.rebalancingEnabled).to.equal(false);

      // Enable again
      await permiSIPAI.connect(user1).setRebalancing(1, true);
      plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.rebalancingEnabled).to.equal(true);
    });

    it("Should revert setRebalancing if not plan owner", async function () {
      await expect(permiSIPAI.connect(user2).setRebalancing(1, false)).to.be.revertedWith("Plan does not exist");
    });
  });

  // ============================================
  // DEPOSIT TO PLAN TESTS
  // ============================================
  describe("Deposit to Plan", function () {
    beforeEach(async () => {
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);
    });

    it("Should allow deposits to a specific plan", async function () {
      const depositAmount = ethers.parseEther("1");

      const aaveBalanceBefore = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceBefore = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceBefore = await ethers.provider.getBalance(await mockUniswap.getAddress());

      const tx = await permiSIPAI.connect(user1).depositToPlan(1, { value: depositAmount });

      await expect(tx).to.emit(permiSIPAI, "DepositExecuted").withArgs(user1.address, 1, depositAmount);

      const aaveBalanceAfter = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceAfter = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceAfter = await ethers.provider.getBalance(await mockUniswap.getAddress());

      expect(aaveBalanceAfter - aaveBalanceBefore).to.equal((depositAmount * 60n) / 100n);
      expect(compoundBalanceAfter - compoundBalanceBefore).to.equal((depositAmount * 30n) / 100n);
      expect(uniswapBalanceAfter - uniswapBalanceBefore).to.equal((depositAmount * 10n) / 100n);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.totalDeposited).to.equal(depositAmount);
    });

    it("Should revert if plan is not active", async function () {
      await permiSIPAI.connect(user1).pausePlanById(1);

      await expect(permiSIPAI.connect(user1).depositToPlan(1, { value: ethers.parseEther("1") })).to.be.revertedWith(
        "No active plan",
      );
    });

    it("Should revert if deposit amount is 0", async function () {
      await expect(permiSIPAI.connect(user1).depositToPlan(1, { value: 0 })).to.be.revertedWith("Must send ETH");
    });
  });

  // ============================================
  // DEPOSIT FOR USER TESTS (Owner deposits on behalf of users)
  // ============================================
  describe("Deposit For User (Owner)", function () {
    beforeEach(async () => {
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);
    });

    it("Should allow owner to deposit on behalf of a user", async function () {
      const depositAmount = ethers.parseEther("1");

      const aaveBalanceBefore = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceBefore = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceBefore = await ethers.provider.getBalance(await mockUniswap.getAddress());

      const tx = await permiSIPAI.connect(owner).depositForUser(user1.address, 1, { value: depositAmount });

      await expect(tx).to.emit(permiSIPAI, "DepositExecuted").withArgs(user1.address, 1, depositAmount);

      const aaveBalanceAfter = await ethers.provider.getBalance(await mockAave.getAddress());
      const compoundBalanceAfter = await ethers.provider.getBalance(await mockCompound.getAddress());
      const uniswapBalanceAfter = await ethers.provider.getBalance(await mockUniswap.getAddress());

      expect(aaveBalanceAfter - aaveBalanceBefore).to.equal((depositAmount * 60n) / 100n);
      expect(compoundBalanceAfter - compoundBalanceBefore).to.equal((depositAmount * 30n) / 100n);
      expect(uniswapBalanceAfter - uniswapBalanceBefore).to.equal((depositAmount * 10n) / 100n);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.totalDeposited).to.equal(depositAmount);
    });

    it("Should revert if non-owner tries to deposit for user", async function () {
      await expect(
        permiSIPAI.connect(user2).depositForUser(user1.address, 1, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Only owner");
    });

    it("Should revert if plan does not exist", async function () {
      await expect(
        permiSIPAI.connect(owner).depositForUser(user2.address, 999, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Plan does not exist");
    });

    it("Should revert if plan is not active", async function () {
      await permiSIPAI.connect(user1).pausePlanById(1);

      await expect(
        permiSIPAI.connect(owner).depositForUser(user1.address, 1, { value: ethers.parseEther("1") }),
      ).to.be.revertedWith("Plan not active");
    });

    it("Should revert if deposit amount is 0", async function () {
      await expect(permiSIPAI.connect(owner).depositForUser(user1.address, 1, { value: 0 })).to.be.revertedWith(
        "Must send ETH",
      );
    });
  });

  // ============================================
  // PLAN MANAGEMENT TESTS (Multi-plan)
  // ============================================
  describe("Multi-Plan Management", function () {
    beforeEach(async () => {
      await permiSIPAI.connect(user1).createSIPPlanWithId(1, ethers.parseUnits("100", 6), 60, 30, 10, true);
    });

    it("Should allow user to cancel a specific plan", async function () {
      const tx = await permiSIPAI.connect(user1).cancelPlanById(1);

      await expect(tx).to.emit(permiSIPAI, "PlanCancelled").withArgs(user1.address, 1);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.active).to.equal(false);
    });

    it("Should allow user to pause a specific plan", async function () {
      const tx = await permiSIPAI.connect(user1).pausePlanById(1);

      await expect(tx).to.emit(permiSIPAI, "PlanPaused").withArgs(user1.address, 1);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.active).to.equal(false);
    });

    it("Should allow user to resume a paused plan", async function () {
      await permiSIPAI.connect(user1).pausePlanById(1);

      const tx = await permiSIPAI.connect(user1).resumePlanById(1);

      await expect(tx).to.emit(permiSIPAI, "PlanResumed").withArgs(user1.address, 1);

      const plan = await permiSIPAI.getPlanById(user1.address, 1);
      expect(plan.active).to.equal(true);
    });

    it("Should revert if trying to resume an active plan", async function () {
      await expect(permiSIPAI.connect(user1).resumePlanById(1)).to.be.revertedWith("Plan already active");
    });

    it("Should revert if non-owner tries to cancel", async function () {
      await expect(permiSIPAI.connect(user2).cancelPlanById(1)).to.be.revertedWith("No active plan");
    });
  });

  // ============================================
  // LEGACY PLAN MANAGEMENT TESTS
  // ============================================
  describe("Legacy Plan Management", function () {
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

        await expect(tx).to.emit(permiSIPAI, "PlanPaused").withArgs(user1.address, 0);

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

        await expect(tx).to.emit(permiSIPAI, "PlanResumed").withArgs(user1.address, 0);

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
    });
  });

  // ============================================
  // OWNER FUNCTIONS TESTS
  // ============================================
  describe("Owner Functions", function () {
    it("Should allow owner to set expert agent address", async function () {
      const newAgentAddress = user2.address;

      const tx = await permiSIPAI.connect(owner).setExpertAgentAddress(newAgentAddress);

      await expect(tx).to.emit(permiSIPAI, "ExpertAgentAddressUpdated").withArgs(ethers.ZeroAddress, newAgentAddress);

      expect(await permiSIPAI.expertAgentAddress()).to.equal(newAgentAddress);
    });

    it("Should allow owner to transfer ownership", async function () {
      await permiSIPAI.connect(owner).transferOwnership(user2.address);

      expect(await permiSIPAI.owner()).to.equal(user2.address);
    });

    it("Should revert if non-owner tries to transfer ownership", async function () {
      await expect(permiSIPAI.connect(user1).transferOwnership(user2.address)).to.be.revertedWith("Only owner");
    });

    it("Should revert if transferring to zero address", async function () {
      await expect(permiSIPAI.connect(owner).transferOwnership(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid address",
      );
    });
  });

  // ============================================
  // STRATEGY ALLOCATION TESTS
  // ============================================
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

  // ============================================
  // EDGE CASES
  // ============================================
  describe("Edge Cases", function () {
    it("Should handle very small amounts", async function () {
      const smallAmount = ethers.parseEther("0.001");
      await permiSIPAI.connect(user1).createSIPPlan(smallAmount, smallAmount, 1, 60, 30, 10, { value: smallAmount });

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.monthlyAmount).to.equal(smallAmount);
      expect(plan.active).to.equal(true);
    });

    it("Should handle large amounts", async function () {
      const largeAmount = ethers.parseEther("1000");
      await permiSIPAI
        .connect(user1)
        .createSIPPlan(largeAmount, ethers.parseEther("100"), 10, 60, 30, 10, { value: largeAmount });

      const plan = await permiSIPAI.getPlan(user1.address);
      expect(plan.totalDeposited).to.equal(largeAmount);
    });

    it("Should return empty plan for address with no plan", async function () {
      const plan = await permiSIPAI.getPlan(user2.address);
      expect(plan.user).to.equal(ethers.ZeroAddress);
      expect(plan.monthlyAmount).to.equal(0);
      expect(plan.active).to.equal(false);
    });
  });

  // ============================================
  // CONTRACT BALANCE
  // ============================================
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

  // ============================================
  // VALIDATION
  // ============================================
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
    });
  });
});
