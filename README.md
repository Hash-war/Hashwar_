# Hashwar · On-Chain Fairness Public Repository

> This repository publicly documents the **core gameplay mechanics** and the
> **on-chain fairness design** of the Hashwar game, so the community can audit
> and verify them.
> Backend service code, private keys, server configuration and all environment
> variables are **not** published in this repository.

Hashwar is a casual chain game themed around **mining + war**: players hold and
earn the HASH token, which they use to upgrade miners, unlock rig slots, buy
attachments, and join each war round — converting hashrate into ongoing yield
and war rewards. **All funds and core state are settled on-chain; the backend
never holds any player's private key or tokens.**

---

## Why focus on "on-chain fairness"

The core promise behind publishing this code: **player assets and rules are not
centered on any server and do not depend on any backend keys.**

- All funds flow directly between **player wallets ↔ the contract**, fully public
  and verifiable at all times.
- The backend **cannot** embezzle, freeze, or arbitrarily mint player assets.
- Mining yield, war distribution, and quest rewards are all decided by **smart
  contract code**; anyone can independently verify them with on-chain data.

---

## Key contract addresses (public blockchain data, directly verifiable)

| Role | Address |
| --- | --- |
| $HASH token (issued via pons V2 bonding curve) | `0xbfF4C0Be20Eb74D3399d63C1A2575Bd7F89968D3` |
| Hashwar game contract (mining / war / quests) | `0x97D8b22D708f1eA543c7638c92CD42BeDfD249bF` |
| pons V2 Bonding Curve (HASH/ETH pricing) | `0xC543DF6f5EbDdC0Eb4452462f637b5e0368767b7` |

> Note: $HASH is issued through the pons V2 bonding curve (denominated in native
> ETH, phase 0). The USD valuation of HASH = real on-chain bonding-curve price ×
> real-time ETH/USD price. **No hardcoded/fixed valuation is used**; it fluctuates
> with the market in real time. Once graduated (phase 2), pricing switches to a
> Uniswap v4 pool.

---

## Gameplay mechanics (see `Hashwar.sol`)

### 1. Miner system
- Each player gets up to **4 rig slots**, starting with 1 unlocked; more can be
  unlocked for a fee.
- Miners are **10 levels**; higher levels increase the base hashrate. Upgrade
  costs grow exponentially by level (see `LEVEL_HASHRATE` / `LEVEL_COST`).
- Each miner tracks **energy / temperature / durability**. These recover
  naturally over time but are also consumed by continuous mining — heating up and
  wearing down the rig, so players must strategically buy energy, cooling, and
  repairs.

### 2. Mining yield (value anchoring, anti-arbitrage)
- Yield is computed as a **USD-denominated fixed rate × mining duration**
  (`rewardRatePerMHPerSec`), then divided by the current `pricePerHash` to get the
  HASH amount.
- Effect: **regardless of how the token price swings, the USD yield per MH/s stays
  constant**, eliminating the "buy cheap, claim expensive" arbitrage loophole.
- Yield is paid from a **prefunded reward pool** (`rewardPool`, zero-sum) and is
  **never arbitrarily minted**.

### 3. War gameplay (`War`)
- Players use their current total hashrate to "join" the current war round; once
  it ends, the prize pool is **distributed proportionally to hashrate share**.
- Settlement waits until the `WAR_DURATION` (600 s) countdown ends; anyone can
  trigger settlement (permissionless), and the pool is capped by the reward-pool
  balance.

### 4. Quest system
- Daily quests (login / complete mining / overclock / upgrade / join war), claimed
  once per day per kind via `questMask`; rewards are also paid from the reward pool.

### 5. Shop and attachments
- Overclock, overclock chip (temporary +50% hashrate), coolant kit, repair, and
  permanent hashrate booster rigs (Rig).

---

## Fund safety & the "zero backend key" design

The comment at the top of `Hashwar.sol` is the core promise:

> All funds flow directly between player wallets and this contract.
> Zero backend keys: nobody except the player triggers their own deposit,
> withdrawal or reward claim. Rewards are paid from a prefunded custody pool
> (zero-sum), never minted arbitrarily.

- **Deposit** `deposit()` / **Withdraw** `withdraw()`: only the player can operate
  on their own balance.
- **Claim rewards** `claimMiningReward()` / `claimWarReward()` / `claimQuest()`:
  paid only to `msg.sender`.
- The reward pool `fundRewardPool()` is publicly prefunded, making the reward
  source transparent.
- `GameVault.sol`: the custody contract, featuring `Ownable` / `ReentrancyGuard`
  (reentrancy protection) / `Pausable` (pausable), further strengthening fund safety.

---

## Code structure

```
contracts/
  contracts/
    Hashwar.sol     # Main game logic: mining / upgrade / attachments / war / quests
    GameVault.sol   # Fund custody: Ownable + reentrancy guard + pausable
    MockERC20.sol   # Test ERC20 (local tests only)
  test/
    Hashwar.test.ts # Gameplay mechanics tests
    GameVault.test.ts
  hardhat.config.ts
frontend/
  ...              # Gameplay UI components (pure display, no backend/private-key logic)
```

> Note: `frontend/` contains only gameplay UI components (pages, miner visuals, war
> panel, i18n copy) to show how the gameplay is presented; it does **not** include
> wallet interaction, RPC configuration, or API-call code involving on-chain/backend
> details.

---

## Build & test locally

Requires Node.js + [Hardhat](https://hardhat.org/).

```bash
cd contracts
npm install
npx hardhat compile          # compile the contracts
npx hardhat test             # run gameplay/mechanics tests
```

---

## License

This repository is licensed under the [MIT License](./LICENSE).

> **Disclaimer**: This repository is published solely to disclose the game's
> gameplay mechanics and fairness design, for learning and review. Smart contracts
> handling real assets should be independently audited by a professional auditing
> firm before use; the author assumes no liability for any loss arising from the
> use of this code.
