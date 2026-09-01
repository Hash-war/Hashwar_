// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HASHWAR - on-chain mining command center
/// @notice All funds flow directly between player wallets and this contract.
///         Zero backend keys: nobody except the player triggers their own
///         deposit, withdrawal or reward claim. Rewards are paid from a
///         prefunded custody pool (zero-sum), never minted arbitrarily.
interface IHASH {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Hashwar {
    // ------------------------------------------------------------- constants
    uint256 public constant MAX_LEVEL = 10;
    uint256 public constant MAX_SLOTS = 4;
    uint256 public constant ENERGY_MAX = 100;
    uint256 public constant ENERGY_REGEN_FREE = 20;
    uint256 public constant DURABILITY_MAX = 100;
    uint256 public constant MIN_CLAIM_SECONDS = 60;
    uint256 public constant MIN_WITHDRAWAL = 100e18;
    uint256 public constant WAR_DURATION = 600;
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public constant OVERCLOCK_BOOST_DURATION = 600;
    uint256 public constant OVERCLOCK_BOOST_MULTIPLIER = 150; // x1.5 => effective *150/100
    // USD price precision (18 decimals, i.e. 1e18 USD per unit).
    uint256 public constant USD_SCALE = 1e18;
    // Hashrate is expressed in 1e6 units (1 MH/s = 1e6).
    uint256 public constant HASHRATE_SCALE = 1e6;

    IHASH public immutable token;

    // ------------------------------------------------------------- ownership
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    // ------------------------------------------------------------- Scheme Y value anchoring
    // Price of the game token in USD, scaled by USD_SCALE. Admin-updatable so the
    // reward pipeline can track the pons bonding-curve price (anti-arbitrage).
    uint256 public pricePerHash;

    // Reward rate per MH/s per second in USD, scaled by USD_SCALE. Combined with
    // pricePerHash this yields a constant USD-denominated mining yield regardless
    // of token price swings (value anchoring, prevents buying-cheap/claiming-expensive).
    uint256 public rewardRatePerMHPerSec;

    // Prefunded reward source. Rewards are paid from here (zero-sum).
    uint256 public rewardPool;

    // Level table: 0 = level 1 ... 9 = level 10. hashrate in 1e6 (MH/s*1e6).
    uint256[10] private LEVEL_HASHRATE = [10e6, 25e6, 40e6, 65e6, 100e6, 160e6, 250e6, 400e6, 650e6, 1000e6];
    uint256[10] private LEVEL_COST    = [0,    500e18, 1500e18, 4000e18, 10000e18, 25000e18, 60000e18, 150000e18, 400000e18, 1000000e18];

    // Shop: per-slot permanent hashrate boosters (added to base level hashrate).
    struct RigBoost {
        uint256 price;
        uint256 bonusHashrate; // in 1e6 units added permanently
        bool exists;
    }
    RigBoost[3] private RIGS;
    // Shop costs (paid from balances)
    uint256 public constant SLOT2_COST = 2000e18;
    uint256 public constant SLOT3_COST = 10000e18;
    uint256 public constant SLOT4_COST = 50000e18;
    uint256 public constant ENERGY_BUY_COST = 500e18;
    uint256 public constant OVERCLOCK_COST = 100e18;
    uint256 public constant REPAIR_COST = 1000e18;
    uint256 public constant COOLANT_COST = 800e18;
    uint256 public constant OVERCLOCK_BOOST_COST = 2500e18;

    // ------------------------------------------------------------- per-user state
    struct Miner {
        uint8 level;          // 1..10
        uint256 energy;       // 0..ENERGY_MAX
        uint256 temp;         // 0..100 (higher => worse)
        uint256 durability;   // 0..DURABILITY_MAX
        uint256 lastMiningAt; // unix seconds
        uint256 totalMiningSeconds;
        uint8 rigIndex;       // 0 = none, 1..3 = permanent boost applied (once per slot)
    }

    // On-chain spendable / withdrawable balance of each player inside the contract.
    mapping(address => uint256) public balances;
    // Up to MAX_SLOTS miners per player. Slot 0 always unlocked.
    mapping(address => Miner[MAX_SLOTS]) public miners;
    mapping(address => uint8) public slotCount;
    mapping(address => uint256) public overclockCount;   // quest counter
    mapping(address => uint256) public joinWarCount;     // quest counter
    // overclockBoost expiry per (user, slot)
    mapping(address => mapping(uint256 => uint256)) public boostUntil;
    // day -> once per (user,kind) per day, encoded as bitmask
    mapping(uint256 => mapping(address => uint256)) public questMask; // bit per kind

    // ------------------------------------------------------------- war state
    struct War {
        uint256 deadline;
        uint256 warPool;        // reserved for this round at settle
        uint256 totalHashrate;  // frozen at settle time
        bool active;
        bool settled;
        uint32 joinCount;
        mapping(address => uint256) hashrate; // zeroed to mark claimed
    }
    mapping(uint256 => War) public wars;
    uint256 public currentWar;

    // quest kind -> reward
    uint256[5] private QUEST_REWARD = [50e18, 25e18, 50e18, 100e18, 100e18];

    // ------------------------------------------------------------- events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount, string kind);
    event Spent(address indexed user, uint256 amount, string kind);
    event MinerUpgraded(address indexed user, uint8 slot, uint8 level);
    event SlotUnlocked(address indexed user, uint8 slot);
    event RigPurchased(address indexed user, uint8 slot, uint8 rig);
    event WarOpened(uint256 round, uint256 warPool, uint256 deadline);
    event WarJoined(uint256 round, address indexed user, uint256 hashrate);
    event WarSettled(uint256 round, uint256 pool);
    event WarRewardClaimed(address indexed user, uint256 amount);

    // ------------------------------------------------------------- errors
    error ZeroAmount();
    error InsufficientBalance();
    error MinWithdrawalNotMet();
    error ClaimTooSoon();
    error NoEnergy();
    error UpgradeUnavailable();
    error DurabilityBroken();
    error WarNotActive();
    error WarNotEnded();
    error NotSettled();
    error NoPendingReward();
    error Claimed();
    error QuestNotEligible();
    error PoolExhausted();
    error SlotLocked();
    error SlotMaxed();
    error RigAlreadyApplied();
    error RigLocked();

    constructor(address token_, uint256 pricePerHash_, uint256 rewardRatePerMHPerSec_) {
        owner = msg.sender;
        token = IHASH(token_);
        pricePerHash = pricePerHash_;
        rewardRatePerMHPerSec = rewardRatePerMHPerSec_;
        RIGS[0] = RigBoost(5000e18, 100e6, true);    // GPU Booster Lv.5   +100 MH/s
        RIGS[1] = RigBoost(15000e18, 400e6, true);   // ASIC Rig Lv.7      +400 MH/s
        RIGS[2] = RigBoost(50000e18, 1000e6, true);  // Server Rack Lv.10  +1000 MH/s
    }

    // ------------------------------------------------------------- owner admin
    /// @notice Update the token's USD price (pricePerHash), scaled by USD_SCALE.
    function setPricePerHash(uint256 pricePerHash_) external onlyOwner {
        require(pricePerHash_ > 0, "price must be > 0");
        pricePerHash = pricePerHash_;
    }

    /// @notice Update the mining reward rate in USD per MH/s per second.
    function setRewardRatePerMHPerSec(uint256 rewardRatePerMHPerSec_) external onlyOwner {
        rewardRatePerMHPerSec = rewardRatePerMHPerSec_;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero owner");
        owner = newOwner;
    }

    // ------------------------------------------------------------- funding
    /// @notice Fund the reward pool (callable by anyone, pool starts empty).
    function fundRewardPool(uint256 amount) external {
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        rewardPool += amount;
    }

    // ------------------------------------------------------------- deposit / withdraw
    function deposit(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (amount < MIN_WITHDRAWAL) revert MinWithdrawalNotMet();
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ------------------------------------------------------------- miner helpers
    function _getOrCreate(address u, uint256 slot) internal returns (Miner storage m) {
        if (slotCount[u] == 0) {
            slotCount[u] = 1;
        }
        if (slot >= slotCount[u]) revert SlotLocked();
        m = miners[u][slot];
        if (m.level == 0) {
            m.level = 1;
            m.energy = ENERGY_REGEN_FREE;
            m.durability = DURABILITY_MAX;
            m.lastMiningAt = block.timestamp;
        }
        _regenerate(m);
    }

    function _regenerate(Miner storage m) internal {
        if (m.energy < ENERGY_MAX) {
            m.energy = m.energy + ENERGY_REGEN_FREE > ENERGY_MAX ? ENERGY_MAX : m.energy + ENERGY_REGEN_FREE;
        }
        if (m.temp > 0) {
            uint256 cool = 0;
            if (block.timestamp > m.lastMiningAt) cool = (block.timestamp - m.lastMiningAt) / 60;
            m.temp = cool >= m.temp ? 0 : m.temp - cool;
        }
    }

    function _baseHashrate(Miner storage m) internal view returns (uint256) {
        uint256 base = LEVEL_HASHRATE[m.level - 1];
        if (m.rigIndex != 0) base += RIGS[m.rigIndex - 1].bonusHashrate;
        return base;
    }

    function hashrateOf(address u) public view returns (uint256) {
        uint256 total = 0;
        uint8 count = slotCount[u] == 0 ? 1 : slotCount[u];
        Miner storage m;
        for (uint256 s = 0; s < count; s++) {
            m = miners[u][s];
            if (m.level == 0 && s != 0) continue;
            uint256 lvl = m.level == 0 ? 1 : m.level;
            uint256 hr = LEVEL_HASHRATE[lvl - 1];
            if (m.rigIndex != 0) hr += RIGS[m.rigIndex - 1].bonusHashrate;
            if (block.timestamp < boostUntil[u][s]) hr = (hr * OVERCLOCK_BOOST_MULTIPLIER) / 100;
            total += hr;
        }
        return total;
    }

    // ------------------------------------------------------------- mining
    function startMining(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        if (m.durability == 0) revert DurabilityBroken();
        m.lastMiningAt = block.timestamp;
    }

    function claimMiningReward(uint256 slot) external returns (uint256 reward) {
        Miner storage m = _getOrCreate(msg.sender, slot);
        uint256 hashrate = _baseHashrate(m);
        bool boosted = block.timestamp < boostUntil[msg.sender][slot];
        uint256 effBase = boosted ? (hashrate * OVERCLOCK_BOOST_MULTIPLIER) / 100 : hashrate;
        if (block.timestamp <= m.lastMiningAt) revert ClaimTooSoon();
        uint256 elapsed = block.timestamp - m.lastMiningAt;
        if (elapsed < MIN_CLAIM_SECONDS) revert ClaimTooSoon();
        if (m.durability == 0) revert DurabilityBroken();
        if (m.energy == 0) revert NoEnergy();

        uint256 energyFactor_pct = 50 + (m.energy * 50) / ENERGY_MAX;            // 50..100
        uint256 tempFactor_pct = 100 - (m.temp * 70) / 100;                       // 100..30
        uint256 durabilityFactor_pct = (m.durability * 100) / 40;                 // capped pool
        if (durabilityFactor_pct > 100) durabilityFactor_pct = 100;

        uint256 effective = (effBase * energyFactor_pct * tempFactor_pct * durabilityFactor_pct) / (100 * 100 * 100);
        // Scheme Y: value-anchored reward. Convert the USD-denominated mining yield
        // into the current number of HASH tokens using the updatable pricePerHash.
        // reward(HASH, 1e18) = effective(MH)*elapsed(s)*rate(USD/MH/s) / pricePerHash(USD/HASH)
        //   = effective * elapsed * rewardRatePerMHPerSec / (HASHRATE_SCALE * pricePerHash)
        require(pricePerHash > 0, "price not set");
        // reward(HASH wei) = effective(MH)*elapsed(s)*rate(USD/MH/s) / pricePerHash(USD/HASH)
        //   = effective * elapsed * rewardRatePerMHPerSec * USD_SCALE / (HASHRATE_SCALE * pricePerHash)
        reward = (effective * elapsed * rewardRatePerMHPerSec * USD_SCALE) / (HASHRATE_SCALE * pricePerHash);

        if (reward > rewardPool) revert PoolExhausted();
        rewardPool -= reward;
        balances[msg.sender] += reward;

        uint256 heatUp = elapsed / 60;
        m.lastMiningAt = block.timestamp;
        m.totalMiningSeconds += elapsed;
        m.energy = m.energy > heatUp ? m.energy - heatUp : 0;
        m.temp = (m.temp + heatUp) > 100 ? 100 : m.temp + heatUp;
        m.durability = m.durability > heatUp ? m.durability - heatUp : 0;

        emit RewardClaimed(msg.sender, reward, "MINING");
    }

    // ------------------------------------------------------------- slots
    function unlockSlot() external {
        uint8 count = slotCount[msg.sender] == 0 ? 1 : slotCount[msg.sender];
        if (count >= MAX_SLOTS) revert SlotMaxed();
        uint256 cost;
        if (count == 1) {
            cost = SLOT2_COST;
        } else if (count == 2) {
            cost = SLOT3_COST;
        } else {
            cost = SLOT4_COST;
        }
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        slotCount[msg.sender] = count + 1;
        emit SlotUnlocked(msg.sender, count + 1);
        emit Spent(msg.sender, cost, "SLOT");
    }

    function slotUnlockCost() external view returns (uint256) {
        uint8 count = slotCount[msg.sender] == 0 ? 1 : slotCount[msg.sender];
        if (count >= MAX_SLOTS) return 0;
        if (count == 1) {
            return SLOT2_COST;
        } else if (count == 2) {
            return SLOT3_COST;
        }
        return SLOT4_COST;
    }

    // ------------------------------------------------------------- spending (per slot)
    function upgrade(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        if (m.level >= MAX_LEVEL) revert UpgradeUnavailable();
        uint256 cost = LEVEL_COST[m.level];
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        m.level += 1;
        emit MinerUpgraded(msg.sender, uint8(slot), m.level);
        emit Spent(msg.sender, cost, "UPGRADE");
    }

    function buyEnergy(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        uint256 cost = ENERGY_BUY_COST;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        m.energy = ENERGY_MAX;
        emit Spent(msg.sender, cost, "ENERGY");
    }

    function overclock(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        if (m.durability == 0) revert DurabilityBroken();
        uint256 cost = OVERCLOCK_COST;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        overclockCount[msg.sender] += 1;
        m.temp = 100;
        emit Spent(msg.sender, cost, "OVERCLOCK");
    }

    function repair(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        uint256 cost = REPAIR_COST;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        m.durability = DURABILITY_MAX;
        emit Spent(msg.sender, cost, "REPAIR");
    }

    /// Coolant Kit: reduce temperature by 20 (floor 0).
    function coolant(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        uint256 cost = COOLANT_COST;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        m.temp = m.temp > 20 ? m.temp - 20 : 0;
        emit Spent(msg.sender, cost, "COOLANT");
    }

    /// Overclock Chip: +50% hashrate for 10 minutes (real multiplier).
    /// Costs durability and raises temperature to simulate stress.
    function overclockBoost(uint256 slot) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        if (m.durability == 0) revert DurabilityBroken();
        uint256 cost = OVERCLOCK_BOOST_COST;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        boostUntil[msg.sender][slot] = block.timestamp + OVERCLOCK_BOOST_DURATION;
        m.temp = 100;
        m.durability = m.durability > 5 ? m.durability - 5 : 0;
        emit Spent(msg.sender, cost, "OVERCLOCK_BOOST");
    }

    /// Purchase a permanent hashrate booster rig (once per slot).
    function buyRig(uint256 slot, uint8 rig) external {
        Miner storage m = _getOrCreate(msg.sender, slot);
        if (rig < 1 || rig > 3) revert RigLocked();
        if (m.rigIndex != 0) revert RigAlreadyApplied();
        uint256 cost = RIGS[rig - 1].price;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        balances[msg.sender] -= cost;
        m.rigIndex = rig;
        emit RigPurchased(msg.sender, uint8(slot), rig);
        emit Spent(msg.sender, cost, "RIG");
    }

    // ------------------------------------------------------------- war
    /// @notice Anyone may open the NEXT war round after the current is settled.
    function openWar(uint256 warPool_) external {
        if (currentWar != 0) {
            War storage prev = wars[currentWar];
            if (prev.active) revert WarNotActive();
            require(prev.settled, "current not settled");
        }
        ++currentWar;
        War storage w = wars[currentWar];
        w.deadline = block.timestamp + WAR_DURATION;
        w.warPool = warPool_;
        w.active = true;
        emit WarOpened(currentWar, warPool_, w.deadline);
    }

    function joinWar() external {
        War storage w = wars[currentWar];
        if (!w.active) revert WarNotActive();
        _getOrCreate(msg.sender, 0);
        (uint256 hashTotal, ) = totalHashrateAndCount(msg.sender);
        uint256 prev = w.hashrate[msg.sender];
        if (prev == 0) w.joinCount += 1;
        w.totalHashrate = w.totalHashrate - prev + hashTotal;
        w.hashrate[msg.sender] = hashTotal;
        joinWarCount[msg.sender] += 1;
        emit WarJoined(currentWar, msg.sender, hashTotal);
    }

    function totalHashrateAndCount(address u) internal view returns (uint256 total, uint8 count) {
        uint8 c = slotCount[u] == 0 ? 1 : slotCount[u];
        Miner storage m;
        for (uint256 s = 0; s < c; s++) {
            m = miners[u][s];
            if (m.level == 0 && s != 0) continue;
            uint256 lvl = m.level == 0 ? 1 : m.level;
            uint256 hr = LEVEL_HASHRATE[lvl - 1];
            if (m.rigIndex != 0) hr += RIGS[m.rigIndex - 1].bonusHashrate;
            if (block.timestamp < boostUntil[u][s]) hr = (hr * OVERCLOCK_BOOST_MULTIPLIER) / 100;
            total += hr;
            count += 1;
        }
    }

    /// @notice Permissionless settle once the war deadline has passed. Reserves the
    ///         war pool from the reward pool so each winner shares the reserved amount.
    function settleWar() external {
        War storage w = wars[currentWar];
        if (!w.active) revert WarNotActive();
        if (block.timestamp < w.deadline) revert WarNotEnded();
        w.active = false;
        w.settled = true;
        if (w.warPool > rewardPool) w.warPool = rewardPool; // cap
        if (w.warPool > 0) rewardPool -= w.warPool;
        emit WarSettled(currentWar, w.warPool);
    }

    /// @notice Claim your share of the settled war pool proportional to hashrate.
    function claimWarReward() external {
        War storage w = wars[currentWar];
        if (w.active) revert WarNotActive();
        if (!w.settled) revert NotSettled();
        uint256 userHash = w.hashrate[msg.sender];
        if (userHash == 0) revert NoPendingReward();
        if (w.totalHashrate == 0) revert NoPendingReward();
        uint256 share = (w.warPool * userHash) / w.totalHashrate;
        // mark claimed
        w.hashrate[msg.sender] = 0;
        balances[msg.sender] += share;
        emit WarRewardClaimed(msg.sender, share);
    }

    // ------------------------------------------------------------- quests
    /// @param kind 0=DAILY_LOGIN 1=COMPLETE_MINING 2=OVERCLOCK 3=UPGRADE 4=JOIN_WAR
    function claimQuest(uint8 kind) external {
        if (kind >= 5) revert QuestNotEligible();
        _getOrCreate(msg.sender, 0);
        uint256 day = block.timestamp / SECONDS_PER_DAY;
        uint256 bit = 1 << kind;
        if (questMask[day][msg.sender] & bit != 0) revert Claimed();

        if (kind == 0) {
            // once per day (enforced by questMask)
        } else if (kind == 1) {
            uint256 total = 0;
            uint8 c = slotCount[msg.sender] == 0 ? 1 : slotCount[msg.sender];
            for (uint256 s = 0; s < c; s++) total += miners[msg.sender][s].totalMiningSeconds;
            if (total == 0) revert QuestNotEligible();
            for (uint256 s = 0; s < c; s++) miners[msg.sender][s].totalMiningSeconds = 0;
        } else if (kind == 2) {
            if (overclockCount[msg.sender] == 0) revert QuestNotEligible();
            overclockCount[msg.sender] = 0;
        } else if (kind == 3) {
            if (slotCount[msg.sender] == 0) { /* not upgraded */ revert QuestNotEligible(); }
            bool anyAbove = false;
            uint8 c = slotCount[msg.sender] == 0 ? 1 : slotCount[msg.sender];
            for (uint256 s = 0; s < c; s++) if (miners[msg.sender][s].level > 1) anyAbove = true;
            if (!anyAbove) revert QuestNotEligible();
        } else if (kind == 4) {
            if (joinWarCount[msg.sender] == 0) revert QuestNotEligible();
            joinWarCount[msg.sender] = 0;
        }

        uint256 reward = QUEST_REWARD[kind];
        if (reward > rewardPool) revert PoolExhausted();
        rewardPool -= reward;
        balances[msg.sender] += reward;
        questMask[day][msg.sender] |= bit;
        emit RewardClaimed(msg.sender, reward, "QUEST");
    }

    // ------------------------------------------------------------- views
    function minerInfo(address u, uint256 slot) external view returns (
        uint8 level, uint256 energy, uint256 temp, uint256 durability,
        uint256 totalMiningSeconds, uint256 lastMiningAt, uint8 rigIndex
    ) {
        Miner storage m = miners[u][slot];
        return (m.level, m.energy, m.temp, m.durability, m.totalMiningSeconds, m.lastMiningAt, m.rigIndex);
    }

    function boostActive(address u, uint256 slot) external view returns (bool) {
        return block.timestamp < boostUntil[u][slot];
    }

    function rigCost(uint8 rig) external view returns (uint256) {
        if (rig < 1 || rig > 3) revert RigLocked();
        return RIGS[rig - 1].price;
    }

    function rigBonus(uint8 rig) external view returns (uint256) {
        if (rig < 1 || rig > 3) revert RigLocked();
        return RIGS[rig - 1].bonusHashrate;
    }

    function warInfo(uint256 round) external view returns (
        uint256 deadline, uint256 warPool, uint256 totalHashrate, bool active, bool settled, uint32 joinCount
    ) {
        War storage w = wars[round];
        return (w.deadline, w.warPool, w.totalHashrate, w.active, w.settled, w.joinCount);
    }
}
