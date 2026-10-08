// The verdict stamp: the one expressive element in the UI.
const TONES = {
  valid: { color: "var(--ok)", label: "VERIFIED", icon: "M8 16.5l5.2 5.2L24 10.5" },
  revoked: { color: "var(--bad)", label: "REVOKED", icon: "M10 10l12 12M22 10L10 22" },
  notfound: { color: "var(--warn)", label: "NOT FOUND", icon: "M16 9v9M16 22.5v.5" },
  tampered: { color: "var(--bad)", label: "ALTERED", icon: "M16 9v9M16 22.5v.5" },
};

export default function Seal({ status }) {
  const t = TONES[status] || TONES.notfound;
  return (
    <svg className="seal" viewBox="0 0 160 160" role="img" aria-label={t.label} style={{ color: t.color }}>
      <defs>
        <path id={`arc-${status}`} d="M80,80 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0" />
      </defs>
      <circle cx="80" cy="80" r="76" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
      <circle cx="80" cy="80" r="44" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text fill="currentColor" fontSize="13" fontWeight="600" letterSpacing="3.4" fontFamily="var(--sans)">
        <textPath href={`#arc-${status}`} startOffset="0">{`${t.label} · ON-CHAIN RECORD · ${t.label} · `}</textPath>
      </text>
      <g transform="translate(64 64)">
        <path d={t.icon} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
