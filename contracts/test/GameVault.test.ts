import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("GameVault", function () {
  let gameVault: any;
  let mockToken: any;
  let owner: SignerWithAddress;
  let backendSigner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000");
  const DEPOSIT_AMOUNT = ethers.parseEther("1000");
  const WITHDRAWAL_COOLDOWN = 24 * 60 * 60;

  beforeEach(async function () {
    [owner, backendSigner, user1, user2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Mock MINER", "MINER", INITIAL_SUPPLY);

    const GameVault = await ethers.getContractFactory("GameVault");
    gameVault = await GameVault.deploy(
      await mockToken.getAddress(),
      backendSigner.address,
      WITHDRAWAL_COOLDOWN
    );

    await mockToken.transfer(user1.address, ethers.parseEther("100000"));
    await mockToken.transfer(user2.address, ethers.parseEther("100000"));
  });

  describe("Deposit", function () {
    it("should accept deposits", async function () {
      await mockToken.connect(user1).approve(await gameVault.getAddress(), DEPOSIT_AMOUNT);
      await gameVault.connect(user1).deposit(DEPOSIT_AMOUNT);

      expect(await gameVault.getUserDeposit(user1.address)).to.equal(DEPOSIT_AMOUNT);
      expect(await gameVault.totalDeposited(user1.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("should reject zero deposits", async function () {
      await expect(gameVault.connect(user1).deposit(0)).to.be.revertedWith("GameVault: zero amount");
    });
  });

  describe("Withdrawal Request", function () {
    beforeEach(async function () {
      await mockToken.connect(user1).approve(await gameVault.getAddress(), DEPOSIT_AMOUNT);
      await gameVault.connect(user1).deposit(DEPOSIT_AMOUNT);
    });

    it("should create withdrawal request", async function () {
      await expect(gameVault.connect(user1).requestWithdrawal(DEPOSIT_AMOUNT))
        .to.emit(gameVault, "WithdrawalRequested");
    });

    it("should reject if insufficient deposit", async function () {
      const tooMuch = DEPOSIT_AMOUNT + ethers.parseEther("1");
      await expect(gameVault.connect(user1).requestWithdrawal(tooMuch))
        .to.be.revertedWith("GameVault: insufficient deposit");
    });
  });

  describe("Backend Signer", function () {
    it("should allow owner to update backend signer", async function () {
      await gameVault.setBackendSigner(user2.address);
      expect(await gameVault.backendSigner()).to.equal(user2.address);
    });

    it("should reject non-owner updating signer", async function () {
      await expect(gameVault.connect(user1).setBackendSigner(user2.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pause", function () {
    it("should allow owner to pause", async function () {
      await gameVault.pause();
      expect(await gameVault.paused()).to.be.true;
    });

    it("should reject deposits when paused", async function () {
      await gameVault.pause();
      await mockToken.connect(user1).approve(await gameVault.getAddress(), DEPOSIT_AMOUNT);
      await expect(gameVault.connect(user1).deposit(DEPOSIT_AMOUNT))
        .to.be.revertedWith("Pausable: paused");
    });
  });
});
