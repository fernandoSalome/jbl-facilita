import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isPreviewBot, parseOptions } from "@/lib/proposals";
import { quemRecebeu } from "@/lib/avisos";
import { grupoMonitoring } from "@/lib/agenda-whatsapp";
import { enviarTexto } from "@/lib/whatsapp";
import { mudou } from "@/lib/congelada";
import { avisoParteA, dadosDaParteA, faltandoNaParteA } from "@/lib/carta-parte-a";

export const dynamic = "force-dynamic";

/**
 * Parte A da carta de intenção (pedido 25/11/2026): os 7 campos do proprietário. Fica guardada como evento da
 * proposta e avisa no JBL - Avisos uma vez só; a minuta e o Central só entram com a carta completa.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (isPreviewBot(req.headers.get("user-agent"))) return json({ ok: true, ignored: "bot" });
  const p = await db.proposal.findFirst({ where: { publicToken: params.token, deletedAt: null }, include: { project: { select: { name: true, municipio: true, uf: true } } } });
  if (!p || p.status === "rascunho" || !parseOptions(p.options).cartaIntencao) return json({ error: "Proposta indisponível" }, 404);
  if (!mudou(p.lockedAt, "carta-parte-a")) return json({ error: "Esta proposta recebe a carta completa." }, 400);

  const bruto = await req.text();
  if (bruto.length > 5000) return json({ error: "Dados grandes demais." }, 413);
  let corpo: unknown = null;
  try {
    corpo = JSON.parse(bruto);
  } catch {
    return json({ error: "Formulário inválido." }, 400);
  }
  const dados = dadosDaParteA(corpo);
  const faltam = faltandoNaParteA(dados);
  if (faltam.length) return json({ error: `Preencha: ${faltam.map((f) => f.nome).join(", ")}.`, faltam: faltam.map((f) => f.k) }, 400);

  const ja = await db.proposalEvent.findFirst({ where: { proposalId: p.id, type: "letter_part_a" }, select: { id: true } });
  await db.proposalEvent.create({ data: { proposalId: p.id, type: "letter_part_a", meta: dados as unknown as Prisma.InputJsonValue } });
  // aviso só na primeira vez, e não quando é alguém da equipe testando
  if (!ja && !(await getSession())) {
    const g = await grupoMonitoring().catch(() => null);
    if (g) await enviarTexto(g.jid, `🤖 ${avisoParteA(quemRecebeu(p), p.project.municipio, p.project.uf, p.name)}`).catch(() => {});
  }
  return json({ ok: true });
}
