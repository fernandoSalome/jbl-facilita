/**
 * Etapa "Assinatura da carta" da área (pedido 20/11/2026). A pessoa preenche a carta de intenção na proposta:
 * a área passa para a assinatura e o link do assinador (Autentique) vai sozinho para ela. Quando todos assinam,
 * a área segue para o estudo de 30 dias. A minuta é a de sempre (minuta-acoes.ts); aqui só ligamos à área.
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

/** Carta recebida: área em Proposta passa para Assinatura e o link vai para a pessoa (WhatsApp; senão, e-mail) */
export async function cartaRecebidaNaArea(proposalId: string, cartaId: string): Promise<string | null> {
  const area = await areaDaProposta(proposalId);
  if (!area || area.etapa !== "proposta") return null;
  await db.area.update({ where: { id: area.id }, data: { etapa: "assinatura" } });
  const { carregarCarta, enviarLinkEmail, enviarLinkWhatsapp } = await import("./minuta-acoes");
  const c = await carregarCarta(cartaId);
  if (!c) return null;
  try {
    const r = await enviarLinkWhatsapp(c);
    return `✅ Já mandei o link de assinatura no WhatsApp dela (${r.para}).`;
  } catch (e1) {
    try {
      const r = await enviarLinkEmail((await carregarCarta(cartaId))!);
      return `✅ Já mandei o link de assinatura no e-mail dela (${r.para}). No WhatsApp não foi: ${(e1 as Error).message}`;
    } catch (e2) {
      return `⚠️ Não consegui mandar o link sozinho (${(e1 as Error).message} / ${(e2 as Error).message}). Mande pela área, na etapa Assinatura.`;
    }
  }
}

/** Todos assinaram: área em Assinatura segue para o estudo de 30 dias */
export async function cartaAssinadaNaArea(proposalId: string) {
  const area = await areaDaProposta(proposalId);
  if (area?.etapa === "assinatura") await db.area.update({ where: { id: area.id }, data: { etapa: "estudo30" } });
}

/** A carta mais recente das propostas da área, para a tela da etapa Assinatura (confere na Autentique quem assinou) */
export async function cartaDaArea(projectId: string | null) {
  if (!projectId) return null;
  const ultima = await db.intentLetter.findFirst({ where: { proposal: { projectId, deletedAt: null } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  if (!ultima) return null;
  const { assinaturasDe, carregarCarta, linkAssinatura, nomeDe, PAPEL, sincronizarAssinaturas } = await import("./minuta-acoes");
  let c = (await carregarCarta(ultima.id))!;
  if (c.minutaStatus === "enviada") c = await sincronizarAssinaturas(c, true).catch(() => c);
  return {
    id: c.id,
    protocolo: c.protocolo,
    nome: nomeDe(c),
    status: c.minutaStatus,
    recebidaEm: c.createdAt.toISOString(),
    linkEnviadoEm: c.linkEnviadoEm?.toISOString() ?? null,
    assinadaEm: c.assinadaEm?.toISOString() ?? null,
    link: c.assinaturaToken && c.minutaStatus !== "revisao" ? linkAssinatura(c.assinaturaToken) : null,
    assinaturas: assinaturasDe(c).map((a) => ({ nome: a.nome, papel: PAPEL[a.papel], vistoEm: a.vistoEm, assinadoEm: a.assinadoEm, recusadoEm: a.recusadoEm, motivo: a.motivo })),
  };
}
export type CartaDaArea = NonNullable<Awaited<ReturnType<typeof cartaDaArea>>>;
