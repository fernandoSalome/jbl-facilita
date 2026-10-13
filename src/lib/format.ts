const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtBRL = (n: number) => brl.format(n || 0);
export const fmtBRL0 = (n: number) => brl0.format(n || 0);

export function fmtNum(n: number, dec = 2) {
  return (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/** 0.35 → "35%"; 0.0067 → "0,67%" */
export function fmtPct(n: number, dec?: number) {
  const v = (n || 0) * 100;
  const d = dec ?? (Number.isInteger(Math.round(v * 100) / 100) ? 0 : 2);
  return `${fmtNum(v, d)}%`;
}

export function fmtM2(n: number, dec = 2) {
  return `${fmtNum(n, dec)} m²`;
}

/** Valores grandes de forma curta: "R$ 34,3 mi" */
export function fmtMi(n: number) {
  if (Math.abs(n) >= 1e6) return `R$ ${fmtNum(n / 1e6, 1)} mi`;
  if (Math.abs(n) >= 1e3) return `R$ ${fmtNum(n / 1e3, 0)} mil`;
  return fmtBRL0(n);
}

export function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtLongDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function relTime(d: Date | string | null | undefined) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)} dias`;
}
