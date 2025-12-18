import { expect } from "chai";
import { ethers } from "hardhat";
import { MockAave, MockCompound, MockUniswap } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Mock Protocols", function () {
  let mockAave: MockAave;
  let mockCompound: MockCompound;
  let mockUniswap: MockUniswap;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  beforeEach(async () => {
    [, user1, user2] = await ethers.getSigners();

    const MockAaveFactory = await ethers.getContractFactory("MockAave");
    mockAave = await MockAaveFactory.deploy();
    await mockAave.waitForDeployment();

    const MockCompoundFactory = await ethers.getContractFactory("MockCompound");
    mockCompound = await MockCompoundFactory.deploy();
    await mockCompound.waitForDeployment();

    const MockUniswapFactory = await ethers.getContractFactory("MockUniswap");
    mockUniswap = await MockUniswapFactory.deploy();
    await mockUniswap.waitForDeployment();
  });

  describe("MockAave", function () {
    describe("Deployment", function () {
      it("Should start with zero total deposits", async function () {
        expect(await mockAave.totalDeposits()).to.equal(0);
      });
    });

    describe("Deposits", function () {
      it("Should accept deposits via deposit function", async function () {
        const depositAmount = ethers.parseEther("1");
        const tx = await mockAave.connect(user1).deposit({ value: depositAmount });

        await expect(tx).to.emit(mockAave, "Deposited").withArgs(user1.address, depositAmount);

        expect(await mockAave.balanceOf(user1.address)).to.equal(depositAmount);
        expect(await mockAave.totalDeposits()).to.equal(depositAmount);
      });

      it("Should accept deposits via receive function", async function () {
        const depositAmount = ethers.parseEther("2");
        const tx = await user1.sendTransaction({
          to: await mockAave.getAddress(),
          value: depositAmount,
        });

        await expect(tx).to.emit(mockAave, "Deposited").withArgs(user1.address, depositAmount);

        expect(await mockAave.balanceOf(user1.address)).to.equal(depositAmount);
        expect(await mockAave.totalDeposits()).to.equal(depositAmount);
      });

      it("Should revert on zero deposit via deposit function", async function () {
        await expect(mockAave.connect(user1).deposit({ value: 0 })).to.be.revertedWith("Must deposit something");
      });

      it("Should track multiple deposits from same user", async function () {
        const deposit1 = ethers.parseEther("1");
        const deposit2 = ethers.parseEther("2");

        await mockAave.connect(user1).deposit({ value: deposit1 });
        await mockAave.connect(user1).deposit({ value: deposit2 });

        expect(await mockAave.balanceOf(user1.address)).to.equal(deposit1 + deposit2);
        expect(await mockAave.totalDeposits()).to.equal(deposit1 + deposit2);
      });

      it("Should track deposits from multiple users separately", async function () {
        const deposit1 = ethers.parseEther("1");
        const deposit2 = ethers.parseEther("3");

        await mockAave.connect(user1).deposit({ value: deposit1 });
        await mockAave.connect(user2).deposit({ value: deposit2 });

        expect(await mockAave.balanceOf(user1.address)).to.equal(deposit1);
        expect(await mockAave.balanceOf(user2.address)).to.equal(deposit2);
        expect(await mockAave.totalDeposits()).to.equal(deposit1 + deposit2);
      });
    });

    describe("Withdrawals", function () {
      beforeEach(async () => {
        await mockAave.connect(user1).deposit({ value: ethers.parseEther("5") });
      });

      it("Should allow withdrawals", async function () {
        const withdrawAmount = ethers.parseEther("2");
        const balanceBefore = await ethers.provider.getBalance(user1.address);

        const tx = await mockAave.connect(user1).withdraw(withdrawAmount);
        const receipt = await tx.wait();
        // Ensure gasUsed and gasPrice are BigInts for multiplication
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

        await expect(tx).to.emit(mockAave, "Withdrawn").withArgs(user1.address, withdrawAmount);

        const balanceAfter = await ethers.provider.getBalance(user1.address);
        expect(balanceAfter).to.equal(balanceBefore + withdrawAmount - gasUsed);
        expect(await mockAave.balanceOf(user1.address)).to.equal(ethers.parseEther("3"));
        expect(await mockAave.totalDeposits()).to.equal(ethers.parseEther("3"));
      });

      it("Should revert on insufficient balance", async function () {
        await expect(mockAave.connect(user1).withdraw(ethers.parseEther("10"))).to.be.revertedWith(
          "Insufficient balance",
        );
      });

      it("Should allow full withdrawal", async function () {
        const fullAmount = ethers.parseEther("5");
        await mockAave.connect(user1).withdraw(fullAmount);

        expect(await mockAave.balanceOf(user1.address)).to.equal(0);
        expect(await mockAave.totalDeposits()).to.equal(0);
      });

      it("Should revert if user has no deposits", async function () {
        await expect(mockAave.connect(user2).withdraw(ethers.parseEther("1"))).to.be.revertedWith(
          "Insufficient balance",
        );
      });
    });

    describe("Balance Queries", function () {
      it("Should return zero for users with no deposits", async function () {
        expect(await mockAave.balanceOf(user1.address)).to.equal(0);
      });

      it("Should return correct balance after deposits", async function () {
        const amount = ethers.parseEther("7");
        await mockAave.connect(user1).deposit({ value: amount });
        expect(await mockAave.balanceOf(user1.address)).to.equal(amount);
      });
    });
  });

  describe("MockCompound", function () {
    describe("Deployment", function () {
      it("Should start with zero total deposits", async function () {
        expect(await mockCompound.totalDeposits()).to.equal(0);
      });
    });

    describe("Deposits", function () {
      it("Should accept deposits via deposit function", async function () {
        const depositAmount = ethers.parseEther("1.5");
        const tx = await mockCompound.connect(user1).deposit({ value: depositAmount });

        await expect(tx).to.emit(mockCompound, "Deposited").withArgs(user1.address, depositAmount);

        expect(await mockCompound.balanceOf(user1.address)).to.equal(depositAmount);
        expect(await mockCompound.totalDeposits()).to.equal(depositAmount);
      });

      it("Should accept deposits via receive function", async function () {
        const depositAmount = ethers.parseEther("2.5");
        const tx = await user1.sendTransaction({
          to: await mockCompound.getAddress(),
          value: depositAmount,
        });

        await expect(tx).to.emit(mockCompound, "Deposited").withArgs(user1.address, depositAmount);
      });

      it("Should revert on zero deposit", async function () {
        await expect(mockCompound.connect(user1).deposit({ value: 0 })).to.be.revertedWith("Must deposit something");
      });
    });

    describe("Withdrawals", function () {
      beforeEach(async () => {
        await mockCompound.connect(user1).deposit({ value: ethers.parseEther("10") });
      });

      it("Should allow withdrawals", async function () {
        const withdrawAmount = ethers.parseEther("4");
        const tx = await mockCompound.connect(user1).withdraw(withdrawAmount);

        await expect(tx).to.emit(mockCompound, "Withdrawn").withArgs(user1.address, withdrawAmount);

        expect(await mockCompound.balanceOf(user1.address)).to.equal(ethers.parseEther("6"));
      });

      it("Should revert on insufficient balance", async function () {
        await expect(mockCompound.connect(user1).withdraw(ethers.parseEther("15"))).to.be.revertedWith(
          "Insufficient balance",
        );
      });
    });
  });

  describe("MockUniswap", function () {
    describe("Deployment", function () {
      it("Should start with zero total deposits", async function () {
        expect(await mockUniswap.totalDeposits()).to.equal(0);
      });
    });

    describe("Deposits", function () {
      it("Should accept deposits via deposit function", async function () {
        const depositAmount = ethers.parseEther("0.5");
        const tx = await mockUniswap.connect(user1).deposit({ value: depositAmount });

        await expect(tx).to.emit(mockUniswap, "Deposited").withArgs(user1.address, depositAmount);

        expect(await mockUniswap.balanceOf(user1.address)).to.equal(depositAmount);
        expect(await mockUniswap.totalDeposits()).to.equal(depositAmount);
      });

      it("Should accept deposits via receive function", async function () {
        const depositAmount = ethers.parseEther("3.5");
        const tx = await user1.sendTransaction({
          to: await mockUniswap.getAddress(),
          value: depositAmount,
        });

        await expect(tx).to.emit(mockUniswap, "Deposited").withArgs(user1.address, depositAmount);
      });

      it("Should revert on zero deposit", async function () {
        await expect(mockUniswap.connect(user1).deposit({ value: 0 })).to.be.revertedWith("Must deposit something");
      });
    });

    describe("Withdrawals", function () {
      beforeEach(async () => {
        await mockUniswap.connect(user1).deposit({ value: ethers.parseEther("8") });
      });

      it("Should allow withdrawals", async function () {
        const withdrawAmount = ethers.parseEther("3");
        const tx = await mockUniswap.connect(user1).withdraw(withdrawAmount);

        await expect(tx).to.emit(mockUniswap, "Withdrawn").withArgs(user1.address, withdrawAmount);

        expect(await mockUniswap.balanceOf(user1.address)).to.equal(ethers.parseEther("5"));
      });

      it("Should revert on insufficient balance", async function () {
        await expect(mockUniswap.connect(user1).withdraw(ethers.parseEther("20"))).to.be.revertedWith(
          "Insufficient balance",
        );
      });
    });
  });

  describe("Cross-Protocol Integration", function () {
    it("Should allow deposits to all three protocols", async function () {
      const amount = ethers.parseEther("1");

      await mockAave.connect(user1).deposit({ value: amount });
      await mockCompound.connect(user1).deposit({ value: amount });
      await mockUniswap.connect(user1).deposit({ value: amount });

      expect(await mockAave.balanceOf(user1.address)).to.equal(amount);
      expect(await mockCompound.balanceOf(user1.address)).to.equal(amount);
      expect(await mockUniswap.balanceOf(user1.address)).to.equal(amount);
    });

    it("Should track total deposits across all protocols", async function () {
      const amount1 = ethers.parseEther("2");
      const amount2 = ethers.parseEther("3");
      const amount3 = ethers.parseEther("5");

      await mockAave.connect(user1).deposit({ value: amount1 });
      await mockCompound.connect(user1).deposit({ value: amount2 });
      await mockUniswap.connect(user1).deposit({ value: amount3 });

      expect(await mockAave.totalDeposits()).to.equal(amount1);
      expect(await mockCompound.totalDeposits()).to.equal(amount2);
      expect(await mockUniswap.totalDeposits()).to.equal(amount3);
    });
  });
});
