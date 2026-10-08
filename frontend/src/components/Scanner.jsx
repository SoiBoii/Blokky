import { useEffect, useRef } from "react";

export default function Scanner({ onResult, onError }) {
  const done = useRef(false);
  useEffect(() => {
    let scanner;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (text) => { if (!done.current) { done.current = true; onResult(text); } },
          () => {}
        );
      } catch (e) {
        onError(typeof e === "string" ? e : e?.message || "Camera unavailable. Allow camera access or paste the link instead.");
      }
    })();
    return () => {
      cancelled = true;
      if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div id="qr-reader" className="scanner" />;
}
