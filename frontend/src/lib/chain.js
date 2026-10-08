import Web3 from "web3";
import { ABI } from "./abi";
import { CONTRACT_ADDRESS, CHAIN_ID, RPC_URL, CHAINS } from "./config";

export const isConfigured = () => /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

/** Read-only contract: uses the public RPC so employers need no wallet. */
function readContract() {
  if (!isConfigured()) throw new Error("Contract address is not configured (see frontend/.env.local).");
  const provider = RPC_URL || window.ethereum;
  if (!provider) throw new Error("No RPC URL configured and no wallet found.");
  return new new Web3(provider).eth.Contract(ABI, CONTRACT_ADDRESS);
}

/** Look a certificate hash up on-chain. */
export async function lookupCertificate(hash) {
  const r = await readContract().methods.verifyCertificate(hash).call();
  return {
    exists: r.exists,
    revoked: r.revoked,
    issuer: r.issuer,
    institutionName: r.institutionName,
    issuedAt: Number(r.issuedAt),
    revokedAt: Number(r.revokedAt),
  };
}

/** Connect MetaMask (or any EIP-1193 wallet) and make sure it is on the right chain. */
export async function connectWallet() {
  if (!window.ethereum) throw new Error("No wallet found. Install MetaMask to continue.");
  if (!isConfigured()) throw new Error("Contract address is not configured (see frontend/.env.local).");
  await window.ethereum.request({ method: "eth_requestAccounts" });
  const hexId = "0x" + CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e) {
    if (e.code === 4902 && CHAINS[CHAIN_ID]) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hexId, ...CHAINS[CHAIN_ID] }],
      });
    } else throw e;
  }
  const web3 = new Web3(window.ethereum);
  const [account] = await web3.eth.getAccounts();
  const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
  return { web3, account, contract };
}

const KNOWN_ERRORS = {
  NotOwner: "Only the contract owner can do this.",
  NotActiveInstitution: "This wallet is not an approved institution.",
  NotCertificateIssuer: "Only the institution that issued this certificate can revoke it.",
  AlreadyIssued: "This certificate was already issued.",
  UnknownCertificate: "No certificate with this hash exists.",
  AlreadyRevoked: "This certificate is already revoked.",
  InvalidHash: "Invalid certificate hash.",
  EmptyName: "Institution name can't be empty.",
  ZeroAddress: "Address can't be empty.",
};

/** Turn wallet / contract errors into a sentence a person can act on. */
export function friendlyError(e) {
  if (e?.code === 4001 || /user (denied|rejected)/i.test(e?.message || "")) return "You cancelled the transaction in your wallet.";
  const blob = [e?.message, e?.cause?.message, e?.data?.message, JSON.stringify(e?.cause || {})].join(" ");
  for (const [name, msg] of Object.entries(KNOWN_ERRORS)) if (blob.includes(name)) return msg;
  if (/insufficient funds/i.test(blob)) return "Not enough test POL for gas. Get some from the Polygon faucet.";
  return e?.message || "Something went wrong.";
}
