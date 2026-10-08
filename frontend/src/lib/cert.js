import Web3 from "web3";

const utils = new Web3().utils;

export const EMPTY = { name: "", rollNo: "", course: "", grade: "", issueDate: "" };

export function newSalt() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fixed field order => the same data always produces the same hash. */
export function hashCert(c) {
  const canonical = JSON.stringify([
    c.name.trim(), c.rollNo.trim(), c.course.trim(), c.grade.trim(), c.issueDate.trim(), c.salt,
  ]);
  return utils.keccak256(canonical);
}

const b64 = {
  enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))),
};

/** The QR code encodes this link. Opening it re-computes the hash and checks the chain. */
export function buildLink(cert, base = window.location.origin + window.location.pathname) {
  const payload = b64.enc(JSON.stringify({
    n: cert.name, r: cert.rollNo, c: cert.course, g: cert.grade, d: cert.issueDate, s: cert.salt,
  }));
  return `${base}?id=${hashCert(cert)}&d=${payload}`;
}

/** Accepts a verification link, a bare 0x hash, or a raw query string. */
export function parseInput(text) {
  const t = (text || "").trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(t)) return { hash: t.toLowerCase(), cert: null };
  let params;
  try { params = new URL(t).searchParams; } catch { params = new URLSearchParams(t.replace(/^\?/, "")); }
  const id = params.get("id");
  const d = params.get("d");
  if (!id && !d) throw new Error("That doesn't look like a CertChain link or certificate hash.");
  let cert = null;
  if (d) {
    try {
      const o = JSON.parse(b64.dec(d));
      cert = { name: o.n, rollNo: o.r, course: o.c, grade: o.g, issueDate: o.d, salt: o.s };
    } catch { throw new Error("The certificate data in this link is damaged."); }
  }
  return { hash: id ? id.toLowerCase() : null, cert };
}

export const fmtDate = (unix) =>
  unix ? new Date(unix * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
