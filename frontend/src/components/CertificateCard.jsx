import { fmtDate } from "../lib/cert";

export default function CertificateCard({ record, qr }) {
  const { cert, institution, hash, issuedAt } = record;
  return (
    <article className="certificate">
      <p className="cert-inst">{institution}</p>
      <h3>Certificate of achievement</h3>
      <p className="cert-body">
        This certifies that <strong>{cert.name}</strong> (roll no. {cert.rollNo}) has completed{" "}
        <strong>{cert.course}</strong> with grade <strong>{cert.grade}</strong>.
      </p>
      <div className="cert-foot">
        <dl>
          <dt>Date of award</dt><dd>{cert.issueDate}</dd>
          <dt>Recorded on-chain</dt><dd>{fmtDate(issuedAt)}</dd>
          <dt>Fingerprint</dt><dd className="mono">{hash.slice(0, 18)}…{hash.slice(-6)}</dd>
        </dl>
        {qr && (
          <figure>
            <img src={qr} alt="QR code that verifies this certificate" />
            <figcaption>Scan to verify</figcaption>
          </figure>
        )}
      </div>
    </article>
  );
}
