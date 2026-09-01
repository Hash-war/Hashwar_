# Hashwar 矿工游戏 · 链上公平性公开仓库

> 本仓库用于公开 Hashwar 游戏的**核心玩法机制**与**链上公平性设计**，供社区审查与核验。
> 后端服务代码、私钥、服务器配置与所有环境变量**不在此仓库公开**。

Hashwar 是一个「挖矿 + 战争」主题的休闲链游：玩家持有/赚取 HASH 代币，用来升级矿机、解锁矿槽、购买配件、参与每轮战争，把算力换算成持续的收益与战争奖金。**全部资金与核心状态都在链上结算，后端不持有任何玩家的私钥或代币。**

---

## 为什么聚焦「链上公平性」

我们公开这套代码的核心承诺：**玩家资产与规则不以任何服务器为中心、不依赖任何后端密钥。**

- 所有资金直接从**玩家钱包 ↔ 合约**流动，全程公开可查。
- 后端**无法**私吞、冻结或凭空铸造玩家资产。
- 挖矿收益/战争分配/任务奖励全部由**合约代码**决定，任何人可用链上数据自行核验。

---

## 关键合约地址（区块链公开数据，可直接核验）

| 角色 | 地址 |
| --- | --- |
| $HASH 代币（pons V2 债券曲线发行） | `0xbfF4C0Be20Eb74D3399d63C1A2575Bd7F89968D3` |
| Hashwar 游戏合约（挖矿/战争/任务） | `0x97D8b22D708f1eA543c7638c92CD42BeDfD249bF` |
| pons V2 Bonding Curve（HASH/ETH 定价） | `0xC543DF6f5EbDdC0Eb4452462f637b5e0368767b7` |

> 说明：$HASH 采用 pons V2 债券曲线发行（原生 ETH 计价，phase 0）。HASH 的美元估值 = 链上债券曲线真实价格 × 实时 ETH 美元价格，**不使用任何硬编码/固定估值**，随市场实时波动。毕业（phase 2）后切换到 Uniswap v4 池定价。

---

## 玩法机制（对应 `Hashwar.sol`）

### 1. 矿机系统
- 每位玩家最多 **4 个矿槽**（slot），初始解锁 1 个，可付费解锁更多。
- 矿机 **10 级**，等级越高基础算力越高；升级成本按等级指数增长（见 `LEVEL_HASHRATE` / `LEVEL_COST`）。
- 每台矿机有 **能量 / 温度 / 耐久** 三项状态，会随时间自然恢复，也会因持续挖矿而消耗、升温、磨损 —— 需要策略性购买能量、降温、维修。

### 2. 挖矿收益（价值锚定，防套利）
- 收益以 **USD 计价的固定产出率 × 挖矿时长** 计算（`rewardRatePerMHPerSec`），再除以当前 `pricePerHash` 换算成 HASH 数量。
- 效果：**无论代币价格怎么波动，每 MH/s 的美元收益率恒定**，杜绝「低价买币、高价领收益」的套利漏洞。
- 收益从**预充值的奖励池**支付（`rewardPool`，零和），**绝不凭空增发**。

### 3. 战争玩法（`War`）
- 玩家用当前总算力「参战」本轮战争；战争结束后**按算力占比分配奖池**。
- 结算需等待 `WAR_DURATION`（600 秒）倒计时结束，任何人均可触发结算（permissionless），奖池上限受奖励池余额约束。

### 4. 任务系统
- 每日任务（登录 / 完成挖矿 / 超频 / 升级 / 参战），按 `questMask` 按天限领一次，奖励同样从奖励池支付。

### 5. 商店与配件
- 超频、超频芯片（临时 +50% 算力）、冷却液、维修、永久算力加成机架（Rig）。

---

## 资金安全与「零后端密钥」设计

`Hashwar.sol` 顶部注释即核心承诺：

> All funds flow directly between player wallets and this contract.
> Zero backend keys: nobody except the player triggers their own deposit,
> withdrawal or reward claim. Rewards are paid from a prefunded custody pool
> (zero-sum), never minted arbitrarily.

- **入金** `deposit()` / **出金** `withdraw()`：只允许玩家本人对自有余额操作。
- **领奖** `claimMiningReward()` / `claimWarReward()` / `claimQuest()`：只发放到 `msg.sender`。
- 奖励池 `fundRewardPool()` 公开预充值，奖励来源透明。
- `GameVault.sol`：资金托管合约，带 `Ownable` / `ReentrancyGuard`（防重入）/ `Pausable`（可暂停），进一步保障资金安全。

---

## 代码结构

```
contracts/
  contracts/
    Hashwar.sol     # 游戏主逻辑：挖矿 / 升级 / 配件 / 战争 / 任务
    GameVault.sol   # 资金托管：Ownable + 防重入 + 可暂停
    MockERC20.sol   # 测试用 ERC20（仅本地测试）
  test/
    Hashwar.test.ts # 玩法机制测试
    GameVault.test.ts
  hardhat.config.ts
frontend/
  ...              # 玩法 UI 组件（纯展示，不含任何后端/私钥逻辑）
```

> 注：`frontend/` 仅包含玩法界面组件（页面、矿机视觉、战争面板、i18n 文案），用于展示玩法呈现方式；不含钱包交互、RPC 配置、API 调用等涉及链上/后端细节的源码。

---

## 本地编译与测试

需要 Node.js + [Hardhat](https://hardhat.org/)。

```bash
cd contracts
npm install
npx hardhat compile          # 编译合约
npx hardhat test             # 运行玩法/机制测试
```

---

## License

本仓库采用 [MIT License](./LICENSE) 授权。

> **免责声明**：本仓库仅用于公开游戏玩法机制与公平性设计，供学习与审查。智能合约涉及真实资产时应由专业审计机构独立审计后再使用；因使用本代码产生的任何损失，作者不承担任何责任。
