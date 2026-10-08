const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const registry = await (await hre.ethers.getContractFactory("CertificateRegistry")).deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("CertificateRegistry deployed to:", address);

  if (process.env.INSTITUTION_ADDRESS) {
    const name = process.env.INSTITUTION_NAME || "Demo Institution";
    await (await registry.addInstitution(process.env.INSTITUTION_ADDRESS, name)).wait();
    console.log(`Approved institution "${name}":`, process.env.INSTITUTION_ADDRESS);
  } else if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    // Local dev convenience: approve Hardhat account #1 as "Demo University"
    const [, uni] = await hre.ethers.getSigners();
    await (await registry.addInstitution(uni.address, "Demo University")).wait();
    console.log("Approved local institution (account #1):", uni.address);
  }

  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const rpc = {
    80002: "https://rpc-amoy.polygon.technology",
    11155111: "https://rpc.sepolia.org",
    31337: "http://127.0.0.1:8545",
  }[chainId] || "";
  const envPath = path.join(__dirname, "..", "frontend", ".env.local");
  fs.writeFileSync(envPath, `VITE_CONTRACT_ADDRESS=${address}\nVITE_CHAIN_ID=${chainId}\nVITE_RPC_URL=${rpc}\n`);
  console.log("Wrote", envPath);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
