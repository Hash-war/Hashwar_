import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const ROBINHOOD_CHAIN_ID = 4663;
const ROBINHOOD_RPC_URL = process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const ROBINHOOD_TESTNET_CHAIN_ID = 46630;
const ROBINHOOD_TESTNET_RPC_URL = "https://rpc.testnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    robinhood: {
      url: ROBINHOOD_RPC_URL,
      chainId: ROBINHOOD_CHAIN_ID,
      accounts: [PRIVATE_KEY],
    },
    robinhoodTestnet: {
      url: ROBINHOOD_TESTNET_RPC_URL,
      chainId: ROBINHOOD_TESTNET_CHAIN_ID,
      accounts: [PRIVATE_KEY],
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
  },
  etherscan: {
    apiKey: {
      robinhood: process.env.BLOCKSCOUT_API_KEY || "",
      robinhoodTestnet: process.env.BLOCKSCOUT_API_KEY || "",
    },
    customChains: [
      {
        network: "robinhood",
        chainId: ROBINHOOD_CHAIN_ID,
        urls: {
          apiURL: "https://robinhoodchain.blockscout.com/api",
          browserURL: "https://robinhoodchain.blockscout.com",
        },
      },
      {
        network: "robinhoodTestnet",
        chainId: ROBINHOOD_TESTNET_CHAIN_ID,
        urls: {
          apiURL: "https://explorer.testnet.chain.robinhood.com/api",
          browserURL: "https://explorer.testnet.chain.robinhood.com",
        },
      },
    ],
  },
};

export default config;
