# CertChain: Blockchain-Based Certificate Verification

Institutions issue certificates whose **fingerprint (hash)** is stored on a smart contract.
Anyone, with no wallet, can verify a certificate by scanning its QR code. If one character of
the name, grade or date is changed, the fingerprint no longer matches and verification fails.

**Stack:** Solidity 0.8.24, Hardhat, Polygon Amoy testnet (or a local node), React (Vite), Web3.js v4

## How it works

```
Institution (MetaMask)                Polygon / Ethereum                 Employer (any browser)
 fill in student details                                                 scans QR on certificate
 salt = random                                                                   |
 hash = keccak256([name, roll, course,                                           v
        grade, date, salt])  --issueCertificate(hash)-->  stores hash      opens link, app re-computes
 QR = link(?id=hash&d=details+salt)                       + issuer + time   hash from details in the link
                                                                |                |
                                                                +-- verifyCertificate(hash) (free read)
                                                  genuine | revoked | not found | altered
```

* **No personal data on-chain**: only a salted hash. The details travel inside the QR link held by the student.
* **Tamper-proof**: the link carries the details; the verifier re-hashes them and compares with the chain.
* **Trusted issuers**: only addresses approved by the contract owner can issue; each can revoke only its own certificates.
* **Gas-free verification**: the Verify page reads through a public RPC; no wallet required.

## Project layout

```
contracts/CertificateRegistry.sol   smart contract (owner, institutions, issue, batch, revoke, verify)
test/CertificateRegistry.test.js    12 Hardhat tests
scripts/deploy.js                   deploys and writes frontend/.env.local
scripts/export-abi.js               copies the compiled ABI into the frontend
frontend/src/lib/                   chain.js (Web3.js), cert.js (hashing + links), config.js, abi.js
frontend/src/components/            Verify, Issue, Admin, Scanner, CertificateCard, Seal
```

## Quick start (local, no funds needed)

```bash
npm install                 # installs root + frontend
npm run compile             # compiles the contract and exports the ABI
npm test                    # runs the 12 contract tests

npm run node                # terminal 1: local blockchain (keep running)
npm run deploy:local        # terminal 2: deploys, approves Hardhat account #1 as "Demo University"
npm run frontend            # terminal 2: http://localhost:5173
```

In MetaMask, add network `http://127.0.0.1:8545` (chain ID `31337`) and import the private keys printed by `npm run node`:

| Role | Hardhat account | Use it on |
|------|-----------------|-----------|
| Owner | #0 | Admin tab: approve other institutions |
| Institution "Demo University" | #1 | Issue tab: issue and revoke |

## Deploy to Polygon Amoy testnet

1. Create a throwaway wallet and get free test POL from <https://faucet.polygon.technology>.
2. `cp .env.example .env`, then set `PRIVATE_KEY` (test wallet only). Optionally set `INSTITUTION_ADDRESS` and `INSTITUTION_NAME`.
3. `npm run deploy:amoy` (writes `frontend/.env.local` with the new address).
4. `npm run frontend`. To host it: `npm --prefix frontend run build`, upload `frontend/dist` to Netlify, Vercel or GitHub Pages,
   and set the same three `VITE_*` variables there. QR links point to wherever the app is hosted, so deploy it before printing real QR codes.

## Demo script (for the viva)

1. Admin tab, owner wallet: approve an institution.
2. Issue tab, institution wallet: issue a certificate, show the QR, print it.
3. Verify tab, no wallet: scan the QR and show the green "genuine" seal.
4. Edit one letter of the `d=` part of the link: the result becomes "Details don't match".
5. Issue tab, Revoke, then re-verify: "Certificate was revoked".
6. Open the transaction on Amoy PolygonScan to show the immutable record.

## Design decisions to explain

* **Hash instead of data**: privacy (DPDP Act / GDPR), lower gas, same tamper-evidence.
* **Salt**: without it, a certificate made of guessable fields (name + course) could be recovered by brute-forcing hashes.
* **Polygon**: very cheap transactions and EVM-compatible, so the same Solidity deploys to Ethereum.
* **Custom errors** instead of revert strings: lower gas, and the UI maps them to readable messages.
* **`issueBatch`**: one transaction for a whole class.
* **Trade-offs**: the issuer's history list lives in browser storage (the chain can't list hashes without the data), and a lost
  link can't be regenerated unless the institution keeps its records. A production system would add a backend or IPFS.

## Extension ideas (to customise per student)

Student login portal, IPFS-hosted PDF with file hash, multi-signature issuing (registrar + dean), certificate expiry dates,
email delivery of links, The Graph indexer for issuer dashboards, multi-language UI.

## Notes

* Hardhat downloads the Solidity compiler on first run, so the first `npm run compile` or `npm test` needs internet access.
* Never commit `.env`. Use a wallet that holds only test funds.
