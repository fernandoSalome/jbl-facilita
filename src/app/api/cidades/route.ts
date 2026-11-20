import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Biblioteca de cidades: cria ou atualiza (cidade + UF) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const nome = s(b.nome, 80);
    const uf = s(b.uf, 2).toUpperCase();
    const leis = s(b.leis, 1000);
    if (!nome || !/^[A-Z]{2}$/.test(uf) || !leis) return json({ error: "Informe cidade, UF e leis vigentes" }, 400);
    const conferidoEm = b.conferidoEm ? new Date(b.conferidoEm) : null;
    const dados = { leis, mapa: s(b.mapa, 300) || null, alerta: s(b.alerta, 300) || null, notas: s(b.notas, 3000) || null, conferidoEm: conferidoEm && !isNaN(+conferidoEm) ? conferidoEm : null };
    const c = await db.cidade.upsert({ where: { nome_uf: { nome, uf } }, create: { nome, uf, ...dados }, update: dados });
    return json({ id: c.id });
  });
}

export async function DELETE(req: Request) {
  return withSession(async () => {
    await db.cidade.deleteMany({ where: { id: new URL(req.url).searchParams.get("id") ?? "" } });
    return json({ ok: true });
  });
}
