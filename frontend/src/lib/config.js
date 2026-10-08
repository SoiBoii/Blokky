export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 80002);
export const RPC_URL = import.meta.env.VITE_RPC_URL || "";

export const CHAINS = {
  80002: {
    chainName: "Polygon Amoy Testnet",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
  31337: {
    chainName: "Hardhat Local",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["http://127.0.0.1:8545"],
  },
};
export const EXPLORER = CHAINS[CHAIN_ID]?.blockExplorerUrls?.[0] || "";
export const NETWORK_NAME = CHAINS[CHAIN_ID]?.chainName || `Chain ${CHAIN_ID}`;
