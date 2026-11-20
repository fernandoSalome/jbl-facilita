import { inflateRawSync } from "node:zlib";

import type { Poligono } from "./poligono";

export type { Poligono } from "./poligono";
export { centro } from "./poligono";

const MAX_PONTOS = 5000;

/** Primeiro polígono (ou linha fechada) do KML */
export function lerKml(xml: string): Poligono | null {
  const m = xml.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
  if (!m) return null;
  const pts = m[1]
    .trim()
    .split(/\s+/)
    .slice(0, MAX_PONTOS)
    .map((t) => t.split(",").map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90)
    .map((c) => [Math.round(c[0] * 1e6) / 1e6, Math.round(c[1] * 1e6) / 1e6] as [number, number]);
  return pts.length >= 3 ? pts : null;
}

/** KMZ é um zip: acha o .kml dentro (cabeçalhos locais, sem biblioteca) */
export function kmlDoKmz(buf: Buffer): string | null {
  let i = 0;
  while (i + 30 <= buf.length && buf.readUInt32LE(i) === 0x04034b50) {
    const metodo = buf.readUInt16LE(i + 8);
    const tam = buf.readUInt32LE(i + 18);
    const nLen = buf.readUInt16LE(i + 26);
    const xLen = buf.readUInt16LE(i + 28);
    const nome = buf.subarray(i + 30, i + 30 + nLen).toString("utf8");
    const ini = i + 30 + nLen + xLen;
    if (/\.kml$/i.test(nome) && tam > 0) {
      const dados = buf.subarray(ini, ini + tam);
      if (metodo === 0) return dados.toString("utf8");
      if (metodo === 8) return inflateRawSync(dados).toString("utf8");
      return null;
    }
    i = ini + tam;
  }
  return null;
}

/** Área em hectares (projeção local equiretangular: erro desprezível numa gleba) */
export function hectares(p: Poligono): number {
  const lat0 = (p.reduce((a, c) => a + c[1], 0) / p.length) * (Math.PI / 180);
  const R = 6371008.8;
  const xy = p.map(([lon, lat]) => [((lon * Math.PI) / 180) * R * Math.cos(lat0), ((lat * Math.PI) / 180) * R]);
  let s = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.round((Math.abs(s) / 2 / 1e4) * 100) / 100;
}

/** Polígono vindo da tela: só aceita [[lon, lat], ...] válido */
export function lerPoligono(v: unknown): Poligono | null {
  if (!Array.isArray(v) || v.length < 3 || v.length > MAX_PONTOS) return null;
  const ok = v.every((c) => Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === "number" && Number.isFinite(n)) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90);
  return ok ? (v as Poligono) : null;
}
