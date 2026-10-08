import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { friendlyError } from "../lib/chain";
import { EMPTY, newSalt, hashCert, buildLink, fmtDate } from "../lib/cert";
import { EXPLORER } from "../lib/config";
import CertificateCard from "./CertificateCard";

const qrFor = (link) => QRCode.toDataURL(link, { width: 480, margin: 1, errorCorrectionLevel: "L" });
const storeKey = (acct) => `certchain:issued:${acct.toLowerCase()}`;
const load = (acct) => { try { return JSON.parse(localStorage.getItem(storeKey(acct))) || []; } catch { return []; } };
const save = (acct, list) => { try { localStorage.setItem(storeKey(acct), JSON.stringify(list)); } catch { /* storage full or blocked */ } };

export default function Issue({ wallet, onConnect }) {
  const [inst, setInst] = useState(null); // { name, active }
  const [form, setForm] = useState(EMPTY);
  const [mode, setMode] = useState("single");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { kind, text }
  const [history, setHistory] = useState([]);
  const [shown, setShown] = useState(null); // { record, qr }

  useEffect(() => {
    if (!wallet) return;
    setHistory(load(wallet.account));
    wallet.contract.methods.getInstitution(wallet.account).call()
      .then((r) => setInst({ name: r.name, active: r.active }))
      .catch(() => setInst({ name: "", active: false }));
  }, [wallet]);

  if (!wallet) {
    return (
      <section>
        <h2>Issue certificates</h2>
        <p className="lede">Connect the wallet your institution was approved with.</p>
        <button className="btn primary" onClick={onConnect}>Connect wallet</button>
      </section>
    );
  }
  if (inst && !inst.active) {
    return (
      <section>
        <h2>Issue certificates</h2>
        <p className="msg bad" role="alert">This wallet ({wallet.account}) isn't an approved institution. Ask the contract owner to add it from the Admin tab.</p>
      </section>
    );
  }

  const persist = (list) => { setHistory(list); save(wallet.account, list); };
  const mkRecord = (cert, tx) => ({
    cert, hash: hashCert(cert), link: buildLink(cert), tx, institution: inst?.name || "",
    issuedAt: Math.floor(Date.now() / 1000), revoked: false,
  });

  async function issueOne(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const cert = { ...form, salt: newSalt() };
      const receipt = await wallet.contract.methods.issueCertificate(hashCert(cert)).send({ from: wallet.account });
      const rec = mkRecord(cert, receipt.transactionHash);
      persist([rec, ...history]);
      setShown({ record: rec, qr: await qrFor(rec.link) });
      setForm(EMPTY);
      setMsg({ kind: "ok", text: "Certificate issued and recorded on the blockchain." });
    } catch (err) { setMsg({ kind: "bad", text: friendlyError(err) }); }
    setBusy(false);
  }

  async function issueBulk(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const rows = csv.split("\n").map((l) => l.trim()).filter(Boolean)
        .filter((l, i) => !(i === 0 && /^name\s*,/i.test(l)))
        .map((l, i) => {
          const [name, rollNo, course, grade, issueDate] = l.split(",").map((s) => (s || "").trim());
          if (!name || !rollNo || !course || !grade || !issueDate) throw new Error(`Row ${i + 1} is missing a column. Expected: name, roll no, course, grade, date.`);
          return { name, rollNo, course, grade, issueDate, salt: newSalt() };
        });
      if (!rows.length) throw new Error("Add at least one row.");
      const receipt = await wallet.contract.methods.issueBatch(rows.map(hashCert)).send({ from: wallet.account });
      const recs = rows.map((c) => mkRecord(c, receipt.transactionHash));
      persist([...recs, ...history]);
      setCsv("");
      const out = "name,roll_no,verification_link\n" + recs.map((r) => `"${r.cert.name}","${r.cert.rollNo}","${r.link}"`).join("\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" }));
      a.download = "certificate-links.csv";
      a.click();
      setMsg({ kind: "ok", text: `${recs.length} certificates issued in one transaction. A CSV with their verification links was downloaded.` });
    } catch (err) { setMsg({ kind: "bad", text: friendlyError(err) }); }
    setBusy(false);
  }

  async function revoke(rec) {
    if (!window.confirm(`Revoke the certificate for ${rec.cert.name}? This can't be undone.`)) return;
    setBusy(true); setMsg(null);
    try {
      await wallet.contract.methods.revokeCertificate(rec.hash).send({ from: wallet.account });
      persist(history.map((h) => (h.hash === rec.hash ? { ...h, revoked: true } : h)));
      setMsg({ kind: "ok", text: `Certificate for ${rec.cert.name} revoked.` });
    } catch (err) { setMsg({ kind: "bad", text: friendlyError(err) }); }
    setBusy(false);
  }

  const view = async (rec) => { setShown({ record: rec, qr: await qrFor(rec.link) }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <section>
      <h2>Issue certificates</h2>
      <p className="lede">Issuing as <strong>{inst?.name || "…"}</strong>. Only a fingerprint goes on-chain; student details stay in the certificate link.</p>

      <div className="seg" role="tablist">
        <button role="tab" aria-selected={mode === "single"} onClick={() => setMode("single")}>One certificate</button>
        <button role="tab" aria-selected={mode === "bulk"} onClick={() => setMode("bulk")}>Many from CSV</button>
      </div>

      {mode === "single" ? (
        <form className="grid" onSubmit={issueOne}>
          <label>Student name<input required value={form.name} onChange={set("name")} /></label>
          <label>Roll number<input required value={form.rollNo} onChange={set("rollNo")} /></label>
          <label>Course<input required value={form.course} onChange={set("course")} placeholder="MCA" /></label>
          <label>Grade<input required value={form.grade} onChange={set("grade")} placeholder="First class, 8.4 CGPA" /></label>
          <label>Date of award<input required type="date" value={form.issueDate} onChange={set("issueDate")} /></label>
          <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Waiting for wallet…" : "Issue certificate"}</button></div>
        </form>
      ) : (
        <form onSubmit={issueBulk}>
          <label>One student per line: name, roll no, course, grade, date (YYYY-MM-DD)
            <textarea rows="6" required value={csv} onChange={(e) => setCsv(e.target.value)}
              placeholder={"Asha Rao, 21MCA014, MCA, First class, 2026-06-30\nRavi Kumar, 21MCA027, MCA, Distinction, 2026-06-30"} />
          </label>
          <div className="actions"><button className="btn primary" disabled={busy}>{busy ? "Waiting for wallet…" : "Issue all"}</button></div>
        </form>
      )}

      {msg && <p className={`msg ${msg.kind}`} role={msg.kind === "bad" ? "alert" : "status"}>{msg.text}</p>}

      {shown && (
        <div className="printable">
          <CertificateCard record={shown.record} qr={shown.qr} />
          <div className="row no-print">
            <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>
            <button className="btn" onClick={() => navigator.clipboard.writeText(shown.record.link)}>Copy verification link</button>
            {EXPLORER && <a className="btn" href={`${EXPLORER}/tx/${shown.record.tx}`} target="_blank" rel="noreferrer">View transaction</a>}
          </div>
        </div>
      )}

      <h3 className="no-print">Issued from this browser</h3>
      {history.length === 0 ? (
        <p className="hint no-print">Nothing issued yet. Certificates you issue will be listed here so you can reprint or revoke them.</p>
      ) : (
        <table className="table no-print">
          <thead><tr><th>Student</th><th>Course</th><th>Issued</th><th>Status</th><th /></tr></thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.hash}>
                <td>{r.cert.name}<br /><span className="hint">{r.cert.rollNo}</span></td>
                <td>{r.cert.course}</td>
                <td>{fmtDate(r.issuedAt)}</td>
                <td><span className={`pill ${r.revoked ? "bad" : "ok"}`}>{r.revoked ? "Revoked" : "Valid"}</span></td>
                <td className="tright">
                  <button className="link" onClick={() => view(r)}>View</button>{" "}
                  <button className="link" onClick={() => navigator.clipboard.writeText(r.link)}>Copy link</button>{" "}
                  {!r.revoked && <button className="link danger" disabled={busy} onClick={() => revoke(r)}>Revoke</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
