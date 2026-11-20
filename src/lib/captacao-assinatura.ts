/**
 * Carta de intenção das propostas da Captação (pedido 20/11/2026), dentro da etapa Proposta da área.
 * A pessoa preenche a proposta: o JBL - Central recebe os dados e a minuta em PDF e confirma se pode enviar.
 * Nada vai para o assinador sozinho: a equipe revisa no editor de contrato e confirma o envio.
 * Quando todos assinam, a área segue para o estudo de 30 dias. A minuta é a de sempre (minuta-acoes.ts).
 */
import { db } from "./db";

/** Área do loteamento desta proposta (a proposta da Captação nasce num projeto ligado à área) */
async function areaDaProposta(proposalId: string) {
  const p = await db.proposal.findUnique({ where: { id: proposalId }, select: { projectId: true } });
  if (!p) return null;
  return db.area.findFirst({ where: { projectId: p.projectId, deletedAt: null }, select: { id: true, etapa: true } });
}

/** A proposta é de uma área da Captação que está na etapa Proposta? */
export const areaEmProposta = async (proposalId: string) => (await areaDaProposta(proposalId))?.etapa === "proposta";

/** Carta recebida numa proposta da Captação: dados e minuta em PDF no JBL - Central, perguntando se pode enviar.
 *  Uma mensagem só (PDF com a legenda), por causa do limite de envio do WhatsApp. */
export async function avisarCartaNoCentral(cartaId: string, dados: string) {
  const { grupoCentral } = await import("./captacao-db");
  const g = await grupoCentral();
  if (!g) return;
  const { carregarCarta, dadosDe, linkMinutaPortal, nomeArquivo, nomeDe, pdfDaMinuta } = await import("./minuta-acoes");
  const c = await carregarCarta(cartaId);
  if (!c) return;
  const p = dadosDe(c).proprietario ?? {};
  const legenda =
    `🤖 📩 *${nomeDe(c)}* respondeu a proposta *${c.proposal.name}* e mandou os dados da carta de intenção.\nProtocolo: ${c.protocolo}\n\n${dados}\n\n` +
    `A minuta está no PDF. *Posso enviar para assinatura?*\n• *enviar link* → mando o link no WhatsApp dela${p.telefone ? ` (${p.telefone})` : " (não informou telefone)"}\n• *enviar email* → mando para o e-mail${p.email ? ` (${p.email})` : " (não informou e-mail)"}\n• *não* → nada é enviado\n\nPara mudar antes, no editor de contrato: ${linkMinutaPortal(c.id)}`;
  const { enviarArquivo } = await import("./whatsapp");
  const pdf = await pdfDaMinuta(c);
  await enviarArquivo(g.jid, { base64: Buffer.from(pdf).toString("base64"), mime: "application/pdf", fileName: nomeArquivo(c), caption: legenda });
}

/** Todos assinaram: área em Proposta segue para o estudo de 30 dias */
export async function cartaAssinadaNaArea(proposalId: string) {
  const area = await areaDaProposta(proposalId);
  if (area?.etapa === "proposta") await db.area.update({ where: { id: area.id }, data: { etapa: "estudo30" } });
}

/** A carta mais recente das propostas da área, para o bloco da carta na etapa Proposta (confere na Autentique quem assinou) */
export async function cartaDaArea(projectId: string | null) {
  if (!projectId) return null;
  const ultima = await db.intentLetter.findFirst({ where: { proposal: { projectId, deletedAt: null } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!ultima) return null;
  const { assinaturasDe, carregarCarta, dadosDe, linkAssinatura, nomeDe, PAPEL, sincronizarAssinaturas } = await import("./minuta-acoes");
  let c = (await carregarCarta(ultima.id))!;
  if (c.minutaStatus === "enviada") c = await sincronizarAssinaturas(c, true).catch(() => c);
  return {
    id: c.id,
    protocolo: c.protocolo,
    nome: nomeDe(c),
    proposta: c.proposal.name,
    telefone: dadosDe(c).proprietario?.telefone ?? "",
    email: dadosDe(c).proprietario?.email ?? "",
    cpf: dadosDe(c).proprietario?.cpf ?? "",
    status: c.minutaStatus,
    recebidaEm: c.createdAt.toISOString(),
    linkEnviadoEm: c.linkEnviadoEm?.toISOString() ?? null,
    assinadaEm: c.assinadaEm?.toISOString() ?? null,
    link: c.assinaturaToken && c.minutaStatus !== "revisao" ? linkAssinatura(c.assinaturaToken) : null,
    assinaturas: assinaturasDe(c).map((a) => ({ nome: a.nome, papel: PAPEL[a.papel], vistoEm: a.vistoEm, assinadoEm: a.assinadoEm, recusadoEm: a.recusadoEm, motivo: a.motivo })),
  };
}
export type CartaDaArea = NonNullable<Awaited<ReturnType<typeof cartaDaArea>>>;
