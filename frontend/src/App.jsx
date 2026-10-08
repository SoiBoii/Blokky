import { useEffect, useState } from "react";
import Verify from "./components/Verify";
import Issue from "./components/Issue";
import Admin from "./components/Admin";
import { connectWallet, friendlyError, isConfigured } from "./lib/chain";
import { NETWORK_NAME } from "./lib/config";
import { shortAddr } from "./lib/cert";

const TABS = [["verify", "Verify"], ["issue", "Issue"], ["admin", "Admin"]];

export default function App() {
  const [tab, setTab] = useState("verify");
  const [wallet, setWallet] = useState(null);
  const [err, setErr] = useState("");

  const connect = async () => {
    try { setErr(""); setWallet(await connectWallet()); }
    catch (e) { setErr(friendlyError(e)); }
  };

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth?.on) return;
    const reset = () => setWallet(null);
    eth.on("accountsChanged", reset);
    eth.on("chainChanged", reset);
    return () => { eth.removeListener("accountsChanged", reset); eth.removeListener("chainChanged", reset); };
  }, []);

  return (
    <>
      <header className="top no-print">
        <h1>CertChain</h1>
        <nav aria-label="Sections">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? "active" : ""} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
        <button className="btn small" onClick={connect}>{wallet ? shortAddr(wallet.account) : "Connect wallet"}</button>
      </header>

      <main>
        {!isConfigured() && (
          <p className="msg bad" role="alert">No contract configured. Deploy it first (<code>npm run deploy:local</code> or <code>deploy:amoy</code>), then restart this app.</p>
        )}
        {err && <p className="msg bad" role="alert">{err}</p>}
        {tab === "verify" && <Verify />}
        {tab === "issue" && <Issue wallet={wallet} onConnect={connect} />}
        {tab === "admin" && <Admin wallet={wallet} onConnect={connect} />}
      </main>

      <footer className="no-print">Network: {NETWORK_NAME}. Certificates are verified directly against a smart contract; no server is involved.</footer>
    </>
  );
}
