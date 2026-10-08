require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { PRIVATE_KEY, AMOY_RPC_URL, SEPOLIA_RPC_URL } = process.env;
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
    // Polygon Amoy testnet (get free test POL from https://faucet.polygon.technology)
    amoy: { url: AMOY_RPC_URL || "https://rpc-amoy.polygon.technology", chainId: 80002, accounts },
    sepolia: { url: SEPOLIA_RPC_URL || "https://rpc.sepolia.org", chainId: 11155111, accounts },
  },
};
