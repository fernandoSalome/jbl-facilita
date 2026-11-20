import { json, withSession } from "@/lib/api";
import { marcarReuniao } from "@/lib/captacao-db";

const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Marca (ou remarca) a reunião da área: um ou mais participantes, com nome, e-mail e, se quiser, telefone */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (sessao) => {
    const b = await req.json().catch(() => ({}));
    const inicio = new Date(b.inicio);
    const fim = new Date(b.fim);
    if (isNaN(+inicio) || isNaN(+fim) || fim <= inicio) return json({ error: "Horário inválido" }, 400);
    const participantes = (Array.isArray(b.participantes) ? b.participantes : [])
      .slice(0, 10)
      .map((p: Record<string, unknown>) => ({ nome: s(p?.nome, 80), email: s(p?.email, 120), telefone: s(p?.telefone, 30) }))
      .filter((p: { nome: string }) => p.nome);
    if (!participantes.length) return json({ error: "Coloque pelo menos um participante" }, 400);
    if (!participantes[0].email && !participantes[0].telefone) return json({ error: "O primeiro participante precisa de e-mail ou telefone" }, 400);
    if (participantes.some((p: { email: string }) => p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))) return json({ error: "E-mail inválido" }, 400);
    try {
      const c = await marcarReuniao(params.id, sessao.sub, { inicio, fim, local: s(b.local, 200), participantes });
      return json({ ok: true, id: c.id });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}
