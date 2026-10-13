"use client";

import { useEffect } from "react";

/** Registra a abertura e, a cada 15 s, o tempo de leitura, até onde rolou e as seções vistas. */
export default function Tracker({ token }: { token: string }) {
  useEffect(() => {
    const url = `/api/public/${token}/view`;
    const start = Date.now();
    let visit: string | null = null;
    let maxScroll = 0;
    const seen = new Set<string>();

    const onScroll = () => {
      const h = document.documentElement;
      maxScroll = Math.max(maxScroll, Math.round(((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100));
    };
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.id && seen.add(e.target.id)),
      { threshold: 0.35 },
    );
    document.querySelectorAll(".jblt section[id]").forEach((el) => io.observe(el));
    window.addEventListener("scroll", onScroll, { passive: true });

    const beat = () => {
      if (!visit || document.visibilityState !== "visible") return;
      const body = JSON.stringify({ kind: "beat", visit, seconds: Math.round((Date.now() - start) / 1000), maxScroll, sections: [...seen] });
      navigator.sendBeacon?.(url, new Blob([body], { type: "application/json" })) || fetch(url, { method: "POST", body, keepalive: true });
    };

    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "open" }) })
      .then((r) => r.json())
      .then((d) => (visit = d.visit ?? null))
      .catch(() => {});

    const t = setInterval(beat, 15000);
    const hide = () => document.visibilityState === "hidden" && beat();
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(t);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [token]);
  return null;
}
