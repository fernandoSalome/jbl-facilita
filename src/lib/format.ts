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

const UNID = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const GRUPOS: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];

function ate999(n: number) {
  if (n === 100) return "cem";
  const parts: string[] = [];
  const c = Math.floor(n / 100);
  const r = n % 100;
  if (c) parts.push(CEM[c]);
  if (r) parts.push(r < 20 ? UNID[r] : r % 10 ? `${DEZ[Math.floor(r / 10)]} e ${UNID[r % 10]}` : DEZ[r / 10]);
  return parts.join(" e ");
}

/** 9957005 → "Nove milhões, novecentos e cinquenta e sete mil e cinco reais" */
export function extensoReais(valor: number) {
  const inteiro = Math.floor(Math.abs(valor) + 1e-9);
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);
  const grupos: number[] = [];
  for (let n = inteiro; n > 0; n = Math.floor(n / 1000)) grupos.push(n % 1000);
  const partes: { t: string; g: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    const nome = i ? ` ${g === 1 ? GRUPOS[i][0] : GRUPOS[i][1]}` : "";
    partes.push({ t: i === 1 && g === 1 ? "mil" : ate999(g) + nome, g });
  }
  let txt = "";
  partes.forEach((p, i) => {
    if (i === 0) txt = p.t;
    else if (i === partes.length - 1 && (p.g < 100 || p.g % 100 === 0)) txt += ` e ${p.t}`;
    else txt += `, ${p.t}`;
  });
  if (!inteiro) txt = centavos ? "" : "zero";
  else txt += inteiro === 1 ? " real" : grupos[0] === 0 && grupos.length > 2 && grupos[1] === 0 ? " de reais" : " reais";
  if (centavos) txt += `${inteiro ? " e " : ""}${ate999(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`;
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
