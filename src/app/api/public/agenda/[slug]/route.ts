import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { criarCompromisso, horariosDe, ocupado } from "@/lib/agenda-server";
import { diaDe, horariosLivres, quando } from "@/lib/agenda";

export const dynamic = "force-dynamic";

async function carregar(slug: string) {
  return db.agendaConfig.findUnique({ where: { slug }, include: { user: { select: { name: true } } } });
}

/** Horários livres de ?dia=AAAA-MM-DD (sem compromissos nem eventos do Google Agenda) */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const c = await carregar(params.slug);
  if (!c) return json({ error: "Agenda não encontrada" }, 404);
  const dia = new URL(req.url).searchParams.get("dia") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ error: "Dia inválido" }, 400);
  const ultimo = diaDe(new Date(Date.now() + c.diasFrente * 864e5));
  if (dia < diaDe(new Date()) || dia > ultimo) return json({ horarios: [] });
  const de = quando(dia, "00:00"), ate = new Date(de.getTime() + 864e5);
  const livres = horariosLivres({ dia, horarios: horariosDe(c), duracaoMin: c.duracaoMin, ocupado: await ocupado(c, de, ate), antecedenciaH: c.antecedenciaH });
  return json({ horarios: livres.map((d) => d.toISOString()) });
}

/** O convidado escolhe um horário: confirma de novo que está livre e marca */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const c = await carregar(params.slug);
  if (!c) return json({ error: "Agenda não encontrada" }, 404);
  const b = await req.json().catch(() => null);
  const inicio = new Date(b?.inicio);
  const nome = String(b?.nome ?? "").trim(), email = String(b?.email ?? "").trim(), tel = String(b?.telefone ?? "").trim();
  if (isNaN(+inicio)) return json({ error: "Horário inválido" }, 400);
  if (!nome) return json({ error: "Escreva o seu nome" }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "E-mail inválido" }, 400);
  if (tel.replace(/\D/g, "").length < 10) return json({ error: "Celular com DDD inválido" }, 400);
  const dia = diaDe(inicio);
  const de = quando(dia, "00:00");
  const livres = horariosLivres({ dia, horarios: horariosDe(c), duracaoMin: c.duracaoMin, ocupado: await ocupado(c, de, new Date(de.getTime() + 864e5)), antecedenciaH: c.antecedenciaH });
  if (!livres.some((d) => d.getTime() === inicio.getTime())) return json({ error: "Esse horário acabou de ser ocupado. Escolha outro." }, 409);
  const novo = await criarCompromisso(c.userId, {
    tipo: "reuniao",
    titulo: `${c.titulo} · ${nome}`,
    descricao: String(b?.observacao ?? "").trim() || c.descricao,
    local: c.local,
    inicio,
    fim: new Date(inicio.getTime() + c.duracaoMin * 60e3),
    convidadoNome: nome,
    convidadoEmail: email,
    convidadoTel: tel,
    origem: "link",
  });
  return json({ ok: true, inicio: novo.inicio, fim: novo.fim, com: c.user.name, local: novo.local });
}
