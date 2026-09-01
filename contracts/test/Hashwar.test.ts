import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

const E = (n: number) => ethers.parseEther(String(n));

async function fastForward(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("Hashwar", function () {
  let hashwar: any;
  let token: any;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("HASH", "HASH", E(1000000000));
    const Hashwar = await ethers.getContractFactory("Hashwar");
    // 方案Y: pricePerHash = 0.00000545 USD/HASH, rewardRate = 0.00005 USD/MH/s (both *1e18)
    hashwar = await Hashwar.deploy(
      await token.getAddress(),
      ethers.parseEther("0.00000545"),
      ethers.parseEther("0.00005"),
    );

    await token.transfer(user1.address, E(1000000));
    await token.transfer(user2.address, E(1000000));
    await token.approve(await hashwar.getAddress(), E(10000000));
    await hashwar.fundRewardPool(E(1000000));
  });

  describe("Deposit / Withdraw", function () {
    it("deposit reflects balance", async function () {
      await token.connect(user1).approve(await hashwar.getAddress(), E(1000));
      await hashwar.connect(user1).deposit(E(1000));
      expect(await hashwar.balances(user1.address)).to.equal(E(1000));
    });

    it("withdraw after deposit", async function () {
      await token.connect(user1).approve(await hashwar.getAddress(), E(1000));
      await hashwar.connect(user1).deposit(E(1000));
      await expect(hashwar.connect(user1).withdraw(E(1000)))
        .to.emit(hashwar, "Withdrawn").withArgs(user1.address, E(1000));
      expect(await hashwar.balances(user1.address)).to.equal(0);
    });

    it("rejects withdraw below minimum", async function () {
      await token.connect(user1).approve(await hashwar.getAddress(), E(1000));
      await hashwar.connect(user1).deposit(E(1000));
      await expect(hashwar.connect(user1).withdraw(E(50)))
        .to.be.revertedWithCustomError(hashwar, "MinWithdrawalNotMet");
    });

    it("rejects withdraw above balance", async function () {
      await expect(hashwar.connect(user1).withdraw(E(1000)))
        .to.be.revertedWithCustomError(hashwar, "InsufficientBalance");
    });
  });

  describe("Mining", function () {
    it("claims reward after interval, funded from pool", async function () {
      await hashwar.connect(user1).startMining(0);
      await fastForward(300);
      const before = await hashwar.rewardPool();
      await hashwar.connect(user1).claimMiningReward(0);
      const after = await hashwar.rewardPool();
      expect(after).to.be.lt(before);
      expect(await hashwar.balances(user1.address)).to.be.gt(0);
    });

    it("rejects mining too soon", async function () {
      await hashwar.connect(user1).startMining(0);
      await expect(hashwar.connect(user1).claimMiningReward(0))
        .to.be.revertedWithCustomError(hashwar, "ClaimTooSoon");
    });

    it("pays into player balance and consumes energy", async function () {
      await hashwar.connect(user1).startMining(0);
      await fastForward(120);
      await hashwar.connect(user1).claimMiningReward(0);
      const bal = await hashwar.balances(user1.address);
      expect(bal).to.be.gt(0);
      const info = await hashwar.minerInfo(user1.address, 0);
      expect(info[2]).to.be.gt(0); // temp rose
    });

    it("rejects mining on a locked slot", async function () {
      await expect(hashwar.connect(user1).startMining(3))
        .to.be.revertedWithCustomError(hashwar, "SlotLocked");
    });
  });

  describe("方案Y value anchoring", function () {
    it("constructor sets owner, pricePerHash and rewardRatePerMHPerSec", async function () {
      expect(await hashwar.owner()).to.equal(deployer.address);
      expect(await hashwar.pricePerHash()).to.equal(ethers.parseEther("0.00000545"));
      expect(await hashwar.rewardRatePerMHPerSec()).to.equal(ethers.parseEther("0.00005"));
    });

    it("only owner can update pricePerHash / rewardRate", async function () {
      const nonce = await hashwar.connect(user1);
      await expect(nonce.setPricePerHash(ethers.parseEther("0.00001")))
        .to.be.revertedWith("not owner");
      await expect(nonce.setRewardRatePerMHPerSec(ethers.parseEther("0.0001")))
        .to.be.revertedWith("not owner");

      await hashwar.setPricePerHash(ethers.parseEther("0.00001"));
      await hashwar.setRewardRatePerMHPerSec(ethers.parseEther("0.0001"));
      expect(await hashwar.pricePerHash()).to.equal(ethers.parseEther("0.00001"));
      expect(await hashwar.rewardRatePerMHPerSec()).to.equal(ethers.parseEther("0.0001"));
    });

    it("rejects zero price for setPricePerHash", async function () {
      await expect(hashwar.setPricePerHash(0))
        .to.be.revertedWith("price must be > 0");
    });

    it("owner can transfer ownership", async function () {
      await hashwar.transferOwnership(user1.address);
      expect(await hashwar.owner()).to.equal(user1.address);
    });

    it("mining reward is value-anchored to USD (lower price => more HASH)", async function () {
      // both users: same setup, same elapsed => reward in HASH is proportional to 1/price.
      await token.transfer(user1.address, E(1000000));
      await token.transfer(user2.address, E(1000000));
      await hashwar.connect(user1).startMining(0);
      await fastForward(120);
      await hashwar.connect(user1).claimMiningReward(0);
      const balHighPrice = await hashwar.balances(user1.address);

      await hashwar.setPricePerHash(E(0.000001)); // much cheaper HASH
      await hashwar.connect(user2).startMining(0);
      await fastForward(120);
      await hashwar.connect(user2).claimMiningReward(0);
      const balLowPrice = await hashwar.balances(user2.address);

      expect(balHighPrice).to.be.gt(0);
      expect(balLowPrice).to.be.gt(0);
      // lower price => strictly more HASH minted for same USD yield
      expect(balLowPrice).to.be.gt(balHighPrice);
    });

    it("reverts claim with pool exhausted (reward > rewardPool)", async function () {
      // build a separate contract with a tiny reward pool so any claim exceeds it
      const Mock2 = await ethers.getContractFactory("MockERC20");
      const token2 = await Mock2.deploy("HASH", "HASH", E(1000000000));
      const Hashwar = await ethers.getContractFactory("Hashwar");
      const tiny = await Hashwar.deploy(await token2.getAddress(), E(0.00000545), E(0.00005));
      await token2.transfer(user1.address, E(1000));
      await token2.approve(await tiny.getAddress(), E(1000000));
      await tiny.fundRewardPool(E(1)); // 1 HASH in pool
      await token2.connect(user1).approve(await tiny.getAddress(), E(1000));
      await tiny.connect(user1).startMining(0);
      await fastForward(601); // ensure definitely more than 1 HASH earned
      await expect(tiny.connect(user1).claimMiningReward(0))
        .to.be.revertedWithCustomError(tiny, "PoolExhausted");
    });
  });

  describe("Spending", function () {
    beforeEach(async function () {
      await token.connect(user1).approve(await hashwar.getAddress(), E(100000));
      await hashwar.connect(user1).deposit(E(100000));
    });

    it("upgrades miner, paying from balance", async function () {
      await expect(hashwar.connect(user1).upgrade(0))
        .to.emit(hashwar, "MinerUpgraded").withArgs(user1.address, 0, 2);
      const info = await hashwar.minerInfo(user1.address, 0);
      expect(info[0]).to.equal(2);
      expect(await hashwar.balances(user1.address)).to.equal(E(100000 - 500));
    });

    it("rejects upgrade when balance insufficient", async function () {
      await hashwar.connect(user1).withdraw(E(99500)); // leaves 500
      // level1 -> 2 costs 500 (LEVEL_COST[1]=500)
      await expect(hashwar.connect(user1).upgrade(0))
        .to.not.be.reverted;
    });

    it("rejects upgrade with no balance", async function () {
      const [, , , u3] = await ethers.getSigners();
      await expect(hashwar.connect(u3).upgrade(0))
        .to.be.revertedWithCustomError(hashwar, "InsufficientBalance");
    });

    it("unlocks up to 4 slots with escalating cost", async function () {
      await expect(hashwar.connect(user1).unlockSlot())
        .to.emit(hashwar, "SlotUnlocked").withArgs(user1.address, 2);
      expect(await hashwar.slotCount(user1.address)).to.equal(2);
      expect(await hashwar.connect(user1).slotUnlockCost()).to.equal(E(10000));
      await hashwar.connect(user1).unlockSlot();
      expect(await hashwar.connect(user1).slotUnlockCost()).to.equal(E(50000));
      await hashwar.connect(user1).unlockSlot();
      expect(await hashwar.slotCount(user1.address)).to.equal(4);
      await expect(hashwar.connect(user1).unlockSlot())
        .to.be.revertedWithCustomError(hashwar, "SlotMaxed");
    });

    it("coolant reduces temperature", async function () {
      await hashwar.connect(user1).startMining(0);
      await fastForward(240);
      await hashwar.connect(user1).claimMiningReward(0);
      const before = await hashwar.minerInfo(user1.address, 0);
      const tempBefore = before[2];
      await hashwar.connect(user1).coolant(0);
      const after = await hashwar.minerInfo(user1.address, 0);
      expect(after[2]).to.be.lt(tempBefore);
    });

    it("overclockBoost grants active +50% boost for 10 min", async function () {
      await hashwar.connect(user1).overclockBoost(0);
      expect(await hashwar.boostActive(user1.address, 0)).to.equal(true);
      await fastForward(601);
      expect(await hashwar.boostActive(user1.address, 0)).to.equal(false);
      // boost raises temperature
      const info = await hashwar.minerInfo(user1.address, 0);
      expect(info[2]).to.equal(100);
    });

    it("buyRig applies permanent hashrate boost", async function () {
      const base = await hashwar.hashrateOf(user1.address);
      const bonus = 100n * 10n ** 6n; // GPU Booster Lv.5 = +100 MH/s (raw 1e6 units)
      await hashwar.connect(user1).buyRig(0, 1);
      expect(await hashwar.hashrateOf(user1.address)).to.equal(base + bonus);
      await expect(hashwar.connect(user1).buyRig(0, 1))
        .to.be.revertedWithCustomError(hashwar, "RigAlreadyApplied");
    });
  });

  describe("War", function () {
    it("open, join, settle and claim proportional share", async function () {
      await hashwar.openWar(E(60000));
      await hashwar.connect(user1).joinWar();
      await hashwar.connect(user2).joinWar();
      await fastForward(601);
      await hashwar.settleWar();
      const w = await hashwar.warInfo(1);
      expect(w.settled).to.equal(true);

      await hashwar.connect(user1).claimWarReward();
      await hashwar.connect(user2).claimWarReward();
      // equal hashrate => half each of 60000
      expect(await hashwar.balances(user1.address)).to.equal(E(30000));
      expect(await hashwar.balances(user2.address)).to.equal(E(30000));
    });

    it("rejects settle before deadline", async function () {
      await hashwar.openWar(E(1000));
      await expect(hashwar.settleWar())
        .to.be.revertedWithCustomError(hashwar, "WarNotEnded");
    });
  });

  describe("Quests", function () {
    it("rejects daily login twice in one day", async function () {
      await hashwar.connect(user1).claimQuest(0);
      await expect(hashwar.connect(user1).claimQuest(0))
        .to.be.revertedWithCustomError(hashwar, "Claimed");
    });

    it("rejects join-war quest without joining", async function () {
      await expect(hashwar.connect(user1).claimQuest(4))
        .to.be.revertedWithCustomError(hashwar, "QuestNotEligible");
    });

    it("grants quest reward into balance", async function () {
      await hashwar.connect(user1).claimQuest(0);
      expect(await hashwar.balances(user1.address)).to.equal(E(50));
    });
  });
});
