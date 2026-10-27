import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isPreviewBot, parseOptions } from "@/lib/proposals";
import { avisarGrupos, linkPortal, quemRecebeu } from "@/lib/avisos";

/** Quem recebeu a proposta começou a preencher a carta de intenção: avisa no grupo (uma vez a cada 2 horas) */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (isPreviewBot(req.headers.get("user-agent"))) return json({ ok: true, ignored: "bot" });
  if (await getSession()) return json({ ok: true, ignored: "staff" });
  const p = await db.proposal.findFirst({ where: { publicToken: params.token, deletedAt: null }, include: { project: { select: { name: true } } } });
  if (!p || p.status === "rascunho" || !parseOptions(p.options).cartaIntencao) return json({ ok: false }, 404);
  const recente = await db.proposalEvent.findFirst({ where: { proposalId: p.id, type: "letter_start", createdAt: { gt: new Date(Date.now() - 2 * 3600 * 1000) } } });
  if (recente) return json({ ok: true, ignored: "recente" });
  await db.proposalEvent.create({ data: { proposalId: p.id, type: "letter_start", meta: {} } });
  await avisarGrupos(
    `👀 *${quemRecebeu(p)}* começou a preencher os dados da carta de intenção (proposta *${p.name}*, ${p.project.name}).\nFique esperto para tirar dúvidas agora!\n\n${linkPortal(new URL(req.url).origin, p.id)}`,
  ).catch(() => {});
  return json({ ok: true });
}
