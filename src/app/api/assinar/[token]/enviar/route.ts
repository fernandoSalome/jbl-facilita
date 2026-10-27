import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cartaPorToken, sessaoOk } from "@/lib/assinatura";
import { numeroWhatsapp, pdfAssinado, type DadosCarta } from "@/lib/minuta";
import { linkMinutaPortal, nomeArquivo } from "@/lib/minuta-acoes";
import { arquivoParaGrupos } from "@/lib/avisos";
import { enviarArquivo } from "@/lib/whatsapp";

export const maxDuration = 60;
/** A Vercel aceita até ~4,5 MB no corpo do pedido */
const MAX = 4 * 1024 * 1024;

/** Recebe o PDF assinado no gov.br, guarda e manda as cópias (para a pessoa e para a equipe) */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const c = await cartaPorToken(params.token);
  if (!c || c.minutaStatus === "revisao") return json({ error: "Link inválido. Fale com a JBL." }, 404);
  if (!sessaoOk(c)) return json({ error: "Confirme o celular de novo para continuar." }, 401);
  if (c.minutaStatus === "assinada") return json({ error: "Esta carta já foi assinada." }, 409);
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return json({ error: "Escolha o arquivo PDF assinado." }, 400);
  if (buf.length > MAX) return json({ error: "O arquivo passa de 4 MB." }, 413);
  const v = pdfAssinado(buf);
  if (!v.ok) return json({ error: "Este PDF não tem assinatura digital. Assine no gov.br e envie o arquivo que o assinador devolve (o que termina em _assinado.pdf)." }, 400);
  const bruto = req.headers.get("x-nome-arquivo") ?? "";
  const nome = (() => { try { return decodeURIComponent(bruto); } catch { return bruto; } })().slice(0, 200) || nomeArquivo(c, true);
  const atual = await db.intentLetter.update({
    where: { id: c.id },
    data: { minutaStatus: "assinada", assinadaEm: new Date(), pdfAssinado: buf, pdfAssinadoNome: nome, assinante: v.nome },
    include: { proposal: { include: { project: true } } },
  });
  await db.proposalEvent.create({ data: { proposalId: c.proposalId, type: "letter_signed", meta: { protocolo: c.protocolo, assinante: v.nome } } });
  const d = (c.data ?? {}) as DadosCarta;
  const quem = d.proprietario?.nome?.trim() || c.proposal.ownerName;
  const arquivo = { base64: buf.toString("base64"), mime: "application/pdf", fileName: nomeArquivo(atual, true) };
  // cópia para a equipe (grupo) e para a pessoa (WhatsApp dela); falha no WhatsApp não desfaz a assinatura
  await Promise.allSettled([
    arquivoParaGrupos(arquivo, `✍️ *${quem}* assinou a carta de intenção pelo gov.br (proposta *${c.proposal.name}*, ${c.proposal.project.name}).\nProtocolo: ${c.protocolo}${v.nome ? `\nAssinatura: ${v.nome}` : ""}\n\n${linkMinutaPortal(c.id)}`),
    (async () => {
      const numero = numeroWhatsapp(d.proprietario?.telefone ?? "");
      if (numero) await enviarArquivo(numero, { ...arquivo, caption: `Sua cópia da carta de intenção assinada (${c.proposal.project.name}). Obrigado! Grupo JBL Incorporadora` });
    })(),
  ]);
  return json({ ok: true });
}
