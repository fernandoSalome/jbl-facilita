import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { parseOptions } from "@/lib/proposals";
import { newProtocolo } from "@/lib/token";
import { avisarGrupos, dadosDaCarta, linkPortal, quemRecebeu } from "@/lib/avisos";
import { linkMinutaPortal } from "@/lib/minuta-acoes";

const MAX_FILE = 6 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const p = await db.proposal.findFirst({ where: { publicToken: params.token, deletedAt: null }, include: { project: { select: { name: true } } } });
  if (!p || p.status === "rascunho") return json({ error: "Proposta indisponível" }, 404);
  if (!parseOptions(p.options).cartaIntencao) return json({ error: "Esta proposta não recebe carta de intenção" }, 400);

  const b = await req.json().catch(() => null);
  // nenhum campo é obrigatório; só confere que veio um formulário
  if (!b || typeof b !== "object" || typeof b.proprietario !== "object") return json({ error: "Formulário inválido." }, 400);
  if (b.matricula && (typeof b.matricula.data !== "string" || b.matricula.data.length > MAX_FILE * 1.4)) {
    return json({ error: "Arquivo da matrícula muito grande (máx. 6 MB)." }, 400);
  }

  const protocolo = newProtocolo();
  await db.intentLetter.create({ data: { proposalId: p.id, protocolo, data: b } });
  await db.proposal.update({
    where: { id: p.id },
    data: { status: ["enviada", "aberta"].includes(p.status) ? "carta_recebida" : p.status },
  });
  await db.proposalEvent.create({ data: { proposalId: p.id, type: "letter", meta: { protocolo } } });
  // aviso no grupo do WhatsApp: os dados enviados e o que fazer com a minuta (sem atrasar nem impedir o envio)
  const nome = String(b.proprietario?.nome ?? "").trim() || quemRecebeu(p);
  const carta = await db.intentLetter.findUnique({ where: { protocolo }, select: { id: true } });
  const tel = String(b.proprietario?.telefone ?? "").trim(), email = String(b.proprietario?.email ?? "").trim();
  await avisarGrupos(
    `📩 *${nome}* enviou os dados da carta de intenção (proposta *${p.name}*, ${p.project.name}).\nProtocolo: ${protocolo}\n\n${dadosDaCarta(b)}\n\n` +
      `A minuta já está montada. O que deseja fazer? Responda aqui:\n• *ver minuta* → mando o PDF da minuta\n• *enviar link* → mando para ela o link de assinatura no WhatsApp${tel ? ` (${tel})` : " (ela não informou telefone)"}\n• *enviar email* → mando o link para o e-mail${email ? ` (${email})` : " (ela não informou e-mail)"}\n• *não* → nada é enviado\n\nPara revisar e editar antes: ${carta ? linkMinutaPortal(carta.id) : linkPortal(new URL(req.url).origin, p.id)}`,
  ).catch(() => {});
  return json({ protocolo });
}
