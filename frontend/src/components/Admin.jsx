import { useEffect, useState } from "react";
import { friendlyError } from "../lib/chain";
import { shortAddr } from "../lib/cert";

export default function Admin({ wallet, onConnect }) {
  const [owner, setOwner] = useState("");
  const [total, setTotal] = useState("0");
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const [lookup, setLookup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const refresh = async () => {
    const [o, t] = await Promise.all([
      wallet.contract.methods.owner().call(),
      wallet.contract.methods.totalIssued().call(),
    ]);
    setOwner(o); setTotal(String(t));
  };
  useEffect(() => { if (wallet) refresh().catch(() => {}); /* eslint-disable-next-line */ }, [wallet]);

  if (!wallet) {
    return (
      <section>
        <h2>Manage institutions</h2>
        <p className="lede">Connect the contract owner's wallet to approve or suspend institutions.</p>
        <button className="btn primary" onClick={onConnect}>Connect wallet</button>
      </section>
    );
  }
  const isOwner = owner && owner.toLowerCase() === wallet.account.toLowerCase();

  async function tx(fn, okText) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ kind: "ok", text: okText }); await refresh(); }
    catch (e) { setMsg({ kind: "bad", text: friendlyError(e) }); }
    setBusy(false);
  }
  const valid = wallet.web3.utils.isAddress(addr.trim());
  const m = wallet.contract.methods;

  return (
    <section>
      <h2>Manage institutions</h2>
      <p className="lede">{total} certificates issued so far. Contract owner: <span className="mono">{shortAddr(owner)}</span></p>
      {!isOwner && <p className="msg bad" role="alert">The connected wallet isn't the contract owner, so these actions will be rejected.</p>}

      <form className="grid" onSubmit={(e) => { e.preventDefault(); tx(() => m.addInstitution(addr.trim(), name.trim()).send({ from: wallet.account }), `${name} can now issue certificates.`); }}>
        <label>Institution wallet address<input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="0x…" /></label>
        <label>Institution name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Demo University" /></label>
        <div className="actions">
          <button className="btn primary" disabled={busy || !valid || !name.trim()}>Approve institution</button>
          <button type="button" className="btn" disabled={!valid}
            onClick={async () => { const r = await m.getInstitution(addr.trim()).call(); setLookup(r.name ? `${r.name} — ${r.active ? "active" : "suspended"}` : "Not registered"); }}>
            Look up
          </button>
          <button type="button" className="btn danger" disabled={busy || !valid}
            onClick={() => tx(() => m.suspendInstitution(addr.trim()).send({ from: wallet.account }), "Institution suspended. It can no longer issue certificates.")}>
            Suspend
          </button>
        </div>
      </form>
      {lookup && <p className="msg ok">{lookup}</p>}
      {msg && <p className={`msg ${msg.kind}`} role={msg.kind === "bad" ? "alert" : "status"}>{msg.text}</p>}
    </section>
  );
}
