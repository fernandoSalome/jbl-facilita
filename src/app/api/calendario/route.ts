import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { conflito, criarCompromisso } from "@/lib/agenda-server";

/** Compromissos da pessoa entre ?de= e ?ate= (ISO) */
export async function GET(req: Request) {
  return withSession(async (s) => {
    const u = new URL(req.url);
    const de = new Date(u.searchParams.get("de") ?? Date.now());
    const ate = new Date(u.searchParams.get("ate") ?? Date.now() + 31 * 864e5);
    const lista = await db.compromisso.findMany({
      where: { userId: s.sub, inicio: { lt: ate }, fim: { gt: de } },
      orderBy: { inicio: "asc" },
    });
    return json(lista);
  });
}

/** Novo compromisso: pessoal ou reunião com convidado (e-mail na hora e SMS 1 hora antes) */
export async function POST(req: Request) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => null);
    const inicio = new Date(b?.inicio), fim = new Date(b?.fim);
    const titulo = String(b?.titulo ?? "").trim();
    const tipo = b?.tipo === "pessoal" ? "pessoal" : "reuniao";
    if (!titulo) return json({ error: "Escreva o título" }, 400);
    if (isNaN(+inicio) || isNaN(+fim) || fim <= inicio) return json({ error: "Horário inválido: o fim tem que ser depois do início" }, 400);
    const email = String(b?.convidadoEmail ?? "").trim();
    if (tipo === "reuniao" && !email && !String(b?.convidadoTel ?? "").trim()) return json({ error: "Coloque o e-mail ou o celular do convidado" }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail do convidado inválido" }, 400);
    const bate = b?.ignorarConflito ? null : await conflito(s.sub, inicio, fim);
    if (bate) return json({ error: `Já existe “${bate.titulo}” nesse horário`, conflito: true }, 409);
    const c = await criarCompromisso(s.sub, {
      tipo, titulo, inicio, fim,
      descricao: b?.descricao, local: b?.local,
      convidadoNome: b?.convidadoNome, convidadoEmail: email || null, convidadoTel: b?.convidadoTel,
    });
    return json(c);
  });
}
