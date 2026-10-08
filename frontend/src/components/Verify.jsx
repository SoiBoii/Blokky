import { useCallback, useEffect, useState } from "react";
import { lookupCertificate, friendlyError } from "../lib/chain";
import { hashCert, parseInput, fmtDate, shortAddr } from "../lib/cert";
import { EXPLORER } from "../lib/config";
import Seal from "./Seal";
import Scanner from "./Scanner";

const COPY = {
  valid: (r) => ({ title: "Certificate is genuine", text: `Issued by ${r.institutionName || "an approved institution"} on ${fmtDate(r.issuedAt)}. The details match the blockchain record.` }),
  revoked: (r) => ({ title: "Certificate was revoked", text: `${r.institutionName || "The issuer"} revoked this certificate on ${fmtDate(r.revokedAt)}. Do not rely on it.` }),
  notfound: () => ({ title: "No record found", text: "No institution has issued a certificate with this fingerprint. It may be forged, or the details were changed." }),
  tampered: () => ({ title: "Details don't match", text: "The certificate details don't match the fingerprint in the link. Treat this certificate as altered." }),
};

export default function Verify() {
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [res, setRes] = useState({ status: "idle" });

  const run = useCallback(async (raw) => {
    setRes({ status: "loading" });
    try {
      const { hash, cert } = parseInput(raw);
      let target = hash;
      if (cert) {
        const computed = hashCert(cert);
        if (hash && hash !== computed) return setRes({ status: "tampered", cert });
        target = computed;
      }
      const chain = await lookupCertificate(target);
      setRes({ status: !chain.exists ? "notfound" : chain.revoked ? "revoked" : "valid", cert, hash: target, chain });
    } catch (e) {
      setRes({ status: "error", message: friendlyError(e) });
    }
  }, []);

  // Opened from a QR code? Verify straight away.
  useEffect(() => {
    if (/[?&](d|id)=/.test(window.location.search)) {
      setText(window.location.href);
      run(window.location.href);
    }
  }, [run]);

  const onScan = (t) => { setScanning(false); setText(t); run(t); };
  const { status, cert, chain, hash } = res;
  const copy = COPY[status]?.(chain || {});

  return (
    <section>
      <h2>Check a certificate</h2>
      <p className="lede">Scan the QR code on the certificate, or paste its verification link. No wallet needed.</p>

      <div className="row">
        <button className="btn primary" onClick={() => { setScanError(""); setScanning((s) => !s); }}>
          {scanning ? "Stop scanning" : "Scan QR code"}
        </button>
      </div>
      {scanning && <Scanner onResult={onScan} onError={(m) => { setScanning(false); setScanError(m); }} />}
      {scanError && <p className="msg bad" role="alert">{scanError}</p>}

      <form className="field-row" onSubmit={(e) => { e.preventDefault(); run(text); }}>
        <label htmlFor="link">Verification link or certificate hash</label>
        <div className="row">
          <input id="link" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://…?id=0x…&d=…  or  0x…" />
          <button className="btn" disabled={!text.trim() || status === "loading"}>
            {status === "loading" ? "Checking…" : "Verify"}
          </button>
        </div>
      </form>

      {status === "error" && <p className="msg bad" role="alert">{res.message}</p>}

      {copy && (
        <div className={`result ${status}`} role="status">
          <Seal status={status} />
          <div className="result-body">
            <h3>{copy.title}</h3>
            <p>{copy.text}</p>
            {cert && (
              <dl className="details">
                <dt>Name</dt><dd>{cert.name}</dd>
                <dt>Roll no.</dt><dd>{cert.rollNo}</dd>
                <dt>Course</dt><dd>{cert.course}</dd>
                <dt>Grade</dt><dd>{cert.grade}</dd>
                <dt>Date of award</dt><dd>{cert.issueDate}</dd>
              </dl>
            )}
            {chain?.exists && (
              <dl className="details">
                <dt>Issuer</dt>
                <dd>{chain.institutionName} {EXPLORER
                  ? <a href={`${EXPLORER}/address/${chain.issuer}`} target="_blank" rel="noreferrer" className="mono">{shortAddr(chain.issuer)}</a>
                  : <span className="mono">{shortAddr(chain.issuer)}</span>}</dd>
                <dt>Fingerprint</dt><dd className="mono wrap">{hash}</dd>
              </dl>
            )}
            {status === "valid" && !cert && (
              <p className="hint">This only confirms the fingerprint exists. Open the full link from the certificate's QR code to also check the name and grade.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
