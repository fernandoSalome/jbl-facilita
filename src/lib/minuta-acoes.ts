/**
 * Ações da minuta da carta de intenção, usadas pelo portal e pelo robô do WhatsApp:
 * montar, gerar o PDF, mandar para assinatura na Autentique, mandar o link para a pessoa
 * e acompanhar quem já assinou.
 */
import { db } from "./db";
import { LINK_BASE } from "./site";
import { comClausulaEletronica, documentoMinuta, minutaInicial, novoTokenAssinatura, numeroWhatsapp, type DadosCarta } from "./minuta";
import { pdfDeHtml } from "./pdf";
import { enviarArquivo, enviarTexto } from "./whatsapp";
import { apagarDocumento, autentiqueConfigurado, baixarAssinado, criarDocumento, lerDocumento, type Signatario } from "./autentique";
import { arquivoParaGrupos, avisarGrupos } from "./avisos";
import { emailConfigurado, enviarEmail } from "./email";
import { contentForProposal } from "./formato-server";
import { parseOverrides } from "./proposals";

export const carregarCarta = (id: string) => db.intentLetter.findUnique({ where: { id }, include: { proposal: { include: { project: true } } } });
export type Carta = NonNullable<Awaited<ReturnType<typeof carregarCarta>>>;

export const dadosDe = (c: Carta) => (c.data ?? {}) as DadosCarta;
export const nomeDe = (c: Carta) => dadosDe(c).proprietario?.nome?.trim() || c.proposal.ownerName;
export const linkAssinatura = (token: string) => `${LINK_BASE}/assinar/${token}`;
export const linkMinutaPortal = (id: string) => `${LINK_BASE}/app/minuta/${id}`;
const rodapeDe = (c: Carta, final = false) => `${final ? "" : "Minuta · "}Carta de intenção · ${c.proposal.project.name} · Protocolo ${c.protocolo}`;

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

/** PDF da minuta: a versão em revisão, ou a travada (a que foi para assinatura) */
export async function pdfDaMinuta(c: Carta, travada = false) {
  const corpo = travada && c.minutaFinal ? c.minutaFinal : await minutaAtual(c);
  return pdfDeHtml(documentoMinuta(corpo, { titulo: `Minuta ${c.protocolo}` }), rodapeDe(c, travada && !!c.minutaFinal));
}

export const nomeArquivo = (c: Carta, assinada = false) =>
  `${assinada ? "Carta de intencao assinada" : "Minuta carta de intencao"} - ${c.proposal.project.name} - ${nomeDe(c)}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\\/:*?"<>|]/g, "");

/* ------------------------------------------------------------ assinatura pela Autentique */

export type Papel = "proprietario" | "conjuge" | "jbl" | "outro";
export type Assinatura = {
  papel: Papel;
  nome: string;
  publicId: string;
  link: string | null;
  vistoEm: string | null;
  assinadoEm: string | null;
  recusadoEm: string | null;
  motivo: string | null;
};

export const assinaturasDe = (c: { assinaturas: unknown }) => (Array.isArray(c.assinaturas) ? (c.assinaturas as Assinatura[]) : []);
export const PAPEL: Record<Papel, string> = { proprietario: "Proprietário(a)", conjuge: "Cônjuge", jbl: "JBL Incorporadora", outro: "Assinante" };

const soDigitos = (x?: string) => (x ?? "").replace(/\D/g, "");

/**
 * Quem assina: o(a) proprietário(a) (CPF conferido e código por SMS no celular que informou),
 * o(a) cônjuge quando houver (CPF conferido) e, se configurado, quem assina pela JBL (por e-mail).
 */
function signatarios(c: Carta): { papel: Papel; nome: string; s: Signatario }[] {
  const d = dadosDe(c);
  const p = d.proprietario ?? {}, j = d.conjuge ?? {};
  const cpf = (x?: string) => (soDigitos(x).length === 11 ? { configs: { cpf: soDigitos(x) } } : {});
  const tel = numeroWhatsapp(p.telefone ?? "");
  const lista: { papel: Papel; nome: string; s: Signatario }[] = [
    { papel: "proprietario", nome: nomeDe(c), s: { name: nomeDe(c), action: "SIGN", ...cpf(p.cpf), ...(tel ? { security_verifications: [{ type: "SMS", verify_phone: `+${tel}` }] } : {}) } },
  ];
  if (j.nome?.trim()) lista.push({ papel: "conjuge", nome: j.nome.trim(), s: { name: j.nome.trim(), action: "SIGN", ...cpf(j.cpf) } });
  const emailJbl = process.env.AUTENTIQUE_EMAIL_JBL?.trim();
  if (emailJbl) lista.push({ papel: "jbl", nome: "JBL Incorporadora", s: { email: emailJbl, action: "SIGN" } });
  return lista;
}

/**
 * Manda para assinatura (ou reaproveita o que já foi): o texto fica travado nesta versão,
 * com a cláusula de aceite da assinatura eletrônica, e vira um documento na Autentique.
 */
export async function garantirLink(c: Carta) {
  if (c.assinaturaToken && c.autentiqueId && c.minutaStatus !== "revisao") return { token: c.assinaturaToken, carta: c };
  if (!autentiqueConfigurado()) throw new Error("A Autentique ainda não foi configurada (falta a chave AUTENTIQUE_TOKEN na Vercel).");
  const texto = comClausulaEletronica(await minutaAtual(c));
  const pdf = await pdfDeHtml(documentoMinuta(texto, { titulo: `Carta de intenção ${c.protocolo}` }), rodapeDe(c, true));
  const quem = signatarios(c);
  const doc = await criarDocumento(`Carta de intenção - ${c.proposal.project.name} - ${nomeDe(c)}`, pdf, nomeArquivo(c).replace(/^Minuta carta/, "Carta"), quem.map((x) => x.s));
  const assinaturas: Assinatura[] = doc.signatures.map((s, i) => {
    // a Autentique devolve na mesma ordem; o da JBL também pode ser achado pelo e-mail
    const q = quem.find((x) => x.s.email && x.s.email.toLowerCase() === (s.email ?? "").toLowerCase()) ?? quem[i];
    return { papel: q?.papel ?? "outro", nome: q?.nome ?? s.name ?? s.email ?? "", publicId: s.public_id, link: s.link?.short_link ?? null, vistoEm: null, assinadoEm: null, recusadoEm: null, motivo: null };
  });
  const token = novoTokenAssinatura();
  const atual = await db.intentLetter.update({
    where: { id: c.id },
    data: { minutaFinal: texto, minutaHtml: texto, assinaturaToken: token, autentiqueId: doc.id, assinaturas, minutaStatus: "enviada", linkGeradoEm: new Date() },
    include: { proposal: { include: { project: true } } },
  });
  return { token, carta: atual };
}

/** Volta a minuta para edição: o pedido de assinatura na Autentique é apagado e o link deixa de valer */
export async function reabrirMinuta(c: Carta) {
  if (c.minutaStatus === "assinada") throw new Error("A carta já foi assinada.");
  if (c.autentiqueId) await apagarDocumento(c.autentiqueId).catch(() => {});
  await db.intentLetter.update({ where: { id: c.id }, data: { minutaStatus: "revisao", assinaturaToken: null, minutaFinal: null, autentiqueId: null, assinaturas: [] } });
}

const primeiroNome = (n: string) => n.split(/\s+/)[0] ?? n;
/** Link de cada pessoa (o nosso, que leva para a página de assinatura dela na Autentique) */
const linkDe = (token: string, papel: Papel) => linkAssinatura(token) + (papel === "proprietario" ? "" : `?p=${papel}`);

/** Mensagem do link: o que fazer, em poucas linhas */
function textoDoLink(carta: Carta, token: string) {
  const conjuge = assinaturasDe(carta).find((a) => a.papel === "conjuge");
  const temSms = !!numeroWhatsapp(dadosDe(carta).proprietario?.telefone ?? "");
  return (
    `Olá, ${primeiroNome(nomeDe(carta))}! Aqui é a JBL Incorporadora.\n\n` +
    `A carta de intenção (${carta.proposal.project.name}) está pronta para assinatura eletrônica:\n${linkDe(token, "proprietario")}\n\n` +
    `É simples:\n1. Abra o link e confira o texto.\n2. Toque em *Assinar* e confirme o seu CPF.\n${temSms ? "3. Digite o código que chega por SMS no seu celular.\n" : ""}` +
    `\nA assinatura eletrônica tem validade jurídica.` +
    (conjuge ? `\n\nLink para *${conjuge.nome}* (cônjuge) assinar:\n${linkDe(token, "conjuge")}` : "")
  );
}

/** Manda o link de assinatura no WhatsApp que a pessoa informou */
export async function enviarLinkWhatsapp(c: Carta) {
  const tel = dadosDe(c).proprietario?.telefone ?? "";
  const numero = numeroWhatsapp(tel);
  if (!numero) throw new Error("A pessoa não informou um telefone válido na carta.");
  const { token, carta } = await garantirLink(c);
  await enviarTexto(numero, textoDoLink(carta, token));
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
  const esc = (x: string) => x.replace(/[<>&"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const conjuge = assinaturasDe(carta).find((a) => a.papel === "conjuge");
  await enviarEmail(
    email,
    `Carta de intenção para assinatura · ${carta.proposal.project.name}`,
    `<div style="font-family:Arial,sans-serif;color:#2B3A4A;line-height:1.6;max-width:560px">
      <p>Olá, ${esc(primeiroNome(nomeDe(carta)))}!</p>
      <p>A carta de intenção (<b>${esc(carta.proposal.project.name)}</b>) está pronta para assinatura eletrônica.</p>
      <p><a href="${link}" style="display:inline-block;background:#C1943D;color:#122A45;padding:12px 18px;border-radius:6px;font-weight:bold;text-decoration:none">Abrir e assinar</a></p>
      <p style="font-size:14px">É simples: abra o link, confira o texto, toque em <b>Assinar</b>, confirme o seu CPF e digite o código que chega por SMS no seu celular.</p>
      ${conjuge ? `<p style="font-size:14px">Link para <b>${esc(conjuge.nome)}</b> (cônjuge) assinar: <a href="${linkDe(token, "conjuge")}">${linkDe(token, "conjuge")}</a></p>` : ""}
      <p style="font-size:13px;color:#697683">A assinatura eletrônica tem validade jurídica.<br>Link: ${link}</p>
      <p>Grupo JBL Incorporadora</p></div>`,
  );
  await db.intentLetter.update({ where: { id: c.id }, data: { linkEnviadoEm: new Date() } });
  return { para: email, link };
}

/**
 * Busca na Autentique quem já viu, assinou ou recusou. Quando todos assinaram, guarda o PDF
 * assinado e manda a cópia para o grupo e para a pessoa. `avisar`: conta no grupo cada assinatura.
 */
export async function sincronizarAssinaturas(c: Carta, avisar = false): Promise<Carta> {
  if (!c.autentiqueId || c.minutaStatus !== "enviada") return c;
  const doc = await lerDocumento(c.autentiqueId);
  const antes = assinaturasDe(c);
  const agora: Assinatura[] = doc.signatures
    .filter((s) => !s.action || /sign/i.test(s.action.name))
    .map((s) => {
      const a = antes.find((x) => x.publicId === s.public_id);
      return {
        papel: a?.papel ?? "outro",
        nome: a?.nome ?? s.user?.name ?? s.name ?? s.email ?? "",
        publicId: s.public_id,
        link: s.link?.short_link ?? a?.link ?? null,
        vistoEm: s.viewed?.created_at ?? null,
        assinadoEm: s.signed?.created_at ?? null,
        recusadoEm: s.rejected?.created_at ?? null,
        motivo: s.rejected?.reason ?? null,
      };
    });
  const quem = `*${nomeDe(c)}* (proposta *${c.proposal.name}*, ${c.proposal.project.name})`;
  const todos = agora.length > 0 && agora.every((a) => a.assinadoEm);

  if (todos && doc.files?.signed) {
    const pdf = await baixarAssinado(doc.files.signed);
    const ultima = agora.map((a) => a.assinadoEm!).sort().pop()!;
    // só um pedido termina (o aviso do webhook e a tela aberta podem chegar juntos)
    const r = await db.intentLetter.updateMany({
      where: { id: c.id, minutaStatus: "enviada" },
      data: { minutaStatus: "assinada", assinadaEm: new Date(ultima), assinaturas: agora, pdfAssinado: pdf, pdfAssinadoNome: nomeArquivo(c, true), assinante: agora.map((a) => a.nome).join(", ") },
    });
    const atual = (await carregarCarta(c.id))!;
    if (r.count) {
      await db.proposalEvent.create({ data: { proposalId: c.proposalId, type: "letter_signed", meta: { protocolo: c.protocolo, assinante: atual.assinante } } });
      const arquivo = { base64: pdf.toString("base64"), mime: "application/pdf", fileName: nomeArquivo(c, true) };
      const numero = numeroWhatsapp(dadosDe(c).proprietario?.telefone ?? "");
      // falha no WhatsApp não desfaz a assinatura
      await Promise.allSettled([
        arquivoParaGrupos(arquivo, `✍️ Carta de intenção de ${quem} *assinada por todos* na Autentique.\nProtocolo: ${c.protocolo}\nAssinaram: ${atual.assinante}\n\n${linkMinutaPortal(c.id)}`),
        numero ? enviarArquivo(numero, { ...arquivo, caption: `Sua cópia da carta de intenção assinada (${c.proposal.project.name}). Obrigado! Grupo JBL Incorporadora` }) : Promise.resolve(),
      ]);
    }
    return atual;
  }

  await db.intentLetter.update({ where: { id: c.id }, data: { assinaturas: agora } });
  if (avisar) {
    const faltam = agora.filter((a) => !a.assinadoEm).map((a) => a.nome);
    for (const a of agora) {
      const b = antes.find((x) => x.publicId === a.publicId);
      if (a.assinadoEm && !b?.assinadoEm && !todos) await avisarGrupos(`✍️ *${a.nome}* assinou a carta de intenção de ${quem}.${faltam.length ? `\nFalta: ${faltam.join(", ")}.` : ""}\n${linkMinutaPortal(c.id)}`).catch(() => {});
      if (a.recusadoEm && !b?.recusadoEm) await avisarGrupos(`⚠️ *${a.nome}* recusou a carta de intenção de ${quem}.${a.motivo ? `\nMotivo: ${a.motivo}` : ""}\n${linkMinutaPortal(c.id)}`).catch(() => {});
    }
  }
  return (await carregarCarta(c.id))!;
}
