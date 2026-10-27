/**
 * Ações da minuta da carta de intenção, usadas pelo portal e pelo robô do WhatsApp:
 * montar, gerar o PDF, gerar o link de assinatura e mandar o link para a pessoa.
 */
import { db } from "./db";
import { LINK_BASE } from "./site";
import { documentoMinuta, minutaInicial, novoTokenAssinatura, numeroWhatsapp, type DadosCarta } from "./minuta";
import { pdfDeHtml } from "./pdf";
import { enviarTexto } from "./whatsapp";
import { emailConfigurado, enviarEmail } from "./email";
import { contentForProposal } from "./formato-server";
import { parseOverrides } from "./proposals";

export const carregarCarta = (id: string) => db.intentLetter.findUnique({ where: { id }, include: { proposal: { include: { project: true } } } });
export type Carta = NonNullable<Awaited<ReturnType<typeof carregarCarta>>>;

export const dadosDe = (c: Carta) => (c.data ?? {}) as DadosCarta;
export const nomeDe = (c: Carta) => dadosDe(c).proprietario?.nome?.trim() || c.proposal.ownerName;
export const linkAssinatura = (token: string) => `${LINK_BASE}/assinar/${token}`;
export const linkMinutaPortal = (id: string) => `${LINK_BASE}/app/minuta/${id}`;
const rodapeDe = (c: Carta) => `Minuta · Carta de intenção · ${c.proposal.project.name} · Protocolo ${c.protocolo}`;

/** Textos em uso na proposta: os do template (na versão dela) com os ajustes feitos só nela */
export async function textosDaProposta(p: Carta["proposal"]) {
  const f = await contentForProposal(p);
  return { ...(f.overrides ?? {}), ...parseOverrides(p.overrides) };
}

/** Minuta montada agora com o texto da carta em uso na proposta e os dados enviados */
export async function minutaMontada(c: Carta) {
  return minutaInicial(dadosDe(c), c.proposal.project, c.createdAt, await textosDaProposta(c.proposal));
}

/** Texto atual da minuta (o editado, ou o montado com os dados enviados) */
export async function minutaAtual(c: Carta) {
  return c.minutaHtml ?? (await minutaMontada(c));
}

/** PDF da minuta: a versão em revisão, ou a travada no link de assinatura */
export async function pdfDaMinuta(c: Carta, travada = false) {
  const corpo = travada && c.minutaFinal ? c.minutaFinal : await minutaAtual(c);
  return pdfDeHtml(documentoMinuta(corpo, { titulo: `Minuta ${c.protocolo}` }), rodapeDe(c));
}

export const nomeArquivo = (c: Carta, assinada = false) =>
  `${assinada ? "Carta de intencao assinada" : "Minuta carta de intencao"} - ${c.proposal.project.name} - ${nomeDe(c)}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\\/:*?"<>|]/g, "");

/** Gera (ou reaproveita) o link de assinatura. Ao gerar, o texto fica travado: é o que a pessoa vai assinar */
export async function garantirLink(c: Carta) {
  if (c.assinaturaToken && c.minutaStatus !== "revisao") return { token: c.assinaturaToken, carta: c };
  const token = novoTokenAssinatura();
  const texto = await minutaAtual(c);
  const atual = await db.intentLetter.update({
    where: { id: c.id },
    data: { minutaFinal: texto, minutaHtml: texto, assinaturaToken: token, minutaStatus: "enviada", linkGeradoEm: new Date(), sessaoHash: null, codigoHash: null, codigoTentativas: 0 },
    include: { proposal: { include: { project: true } } },
  });
  return { token, carta: atual };
}

/** Volta a minuta para edição: o link anterior deixa de valer */
export async function reabrirMinuta(c: Carta) {
  if (c.minutaStatus === "assinada") throw new Error("A carta já foi assinada.");
  await db.intentLetter.update({ where: { id: c.id }, data: { minutaStatus: "revisao", assinaturaToken: null, minutaFinal: null, sessaoHash: null, codigoHash: null } });
}

const primeiroNome = (n: string) => n.split(/\s+/)[0] ?? n;

/** Manda o link de assinatura no WhatsApp que a pessoa informou */
export async function enviarLinkWhatsapp(c: Carta) {
  const tel = dadosDe(c).proprietario?.telefone ?? "";
  const numero = numeroWhatsapp(tel);
  if (!numero) throw new Error("A pessoa não informou um telefone válido na carta.");
  const { token, carta } = await garantirLink(c);
  await enviarTexto(
    numero,
    `Olá, ${primeiroNome(nomeDe(carta))}! Aqui é a JBL Incorporadora.\n\nA minuta da sua carta de intenção (${carta.proposal.project.name}) está pronta para assinatura:\n${linkAssinatura(token)}\n\nAo abrir, confirme o seu celular com o código que vamos mandar aqui e assine com a sua conta gov.br.`,
  );
  await db.intentLetter.update({ where: { id: c.id }, data: { linkEnviadoEm: new Date() } });
  return { para: tel, link: linkAssinatura(token) };
}

/** Manda o link de assinatura para o e-mail que a pessoa informou */
export async function enviarLinkEmail(c: Carta) {
  const email = dadosDe(c).proprietario?.email?.trim() ?? "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("A pessoa não informou um e-mail válido na carta.");
  if (!emailConfigurado()) throw new Error("O envio por e-mail ainda não foi configurado no sistema.");
  const { token, carta } = await garantirLink(c);
  const link = linkAssinatura(token);
  const nome = primeiroNome(nomeDe(carta));
  await enviarEmail(
    email,
    `Minuta da carta de intenção para assinatura · ${carta.proposal.project.name}`,
    `<div style="font-family:Arial,sans-serif;color:#2B3A4A;line-height:1.6;max-width:560px">
      <p>Olá, ${nome.replace(/[<>&]/g, "")}!</p>
      <p>A minuta da sua carta de intenção (<b>${carta.proposal.project.name.replace(/[<>&]/g, "")}</b>) está pronta para assinatura.</p>
      <p><a href="${link}" style="display:inline-block;background:#C1943D;color:#122A45;padding:12px 18px;border-radius:6px;font-weight:bold;text-decoration:none">Abrir e assinar com gov.br</a></p>
      <p style="font-size:13px;color:#697683">Ao abrir, confirme o seu celular com o código que enviaremos pelo WhatsApp e assine com a sua conta gov.br.<br>Link: ${link}</p>
      <p>Grupo JBL Incorporadora</p></div>`,
  );
  await db.intentLetter.update({ where: { id: c.id }, data: { linkEnviadoEm: new Date() } });
  return { para: email, link };
}
