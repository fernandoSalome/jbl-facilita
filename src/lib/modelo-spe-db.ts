import { db } from "./db";
import { CHAVE_SPE, disposicao, nomeDoModelo } from "./modelo-spe";

/** Banco do modelo da minuta da SPE (as regras ficam em modelo-spe.ts) */

export const salvarModeloSpe = (dados: Buffer, nome: string, por: string) => {
  const d = { nome: nomeDoModelo(nome), mime: "application/pdf", tamanho: dados.length, dados, atualizadoPor: por };
  return db.modeloArquivo.upsert({ where: { chave: CHAVE_SPE }, create: { chave: CHAVE_SPE, ...d }, update: d });
};

/** Nome, tamanho e data, sem o arquivo */
export const infoModeloSpe = () =>
  db.modeloArquivo.findUnique({ where: { chave: CHAVE_SPE }, select: { nome: true, tamanho: true, atualizadoEm: true, atualizadoPor: true } });

/** O PDF como resposta: na página (inline) ou para baixar */
export async function respostaModeloSpe(baixar: boolean) {
  const m = await db.modeloArquivo.findUnique({ where: { chave: CHAVE_SPE } });
  if (!m) return new Response("Modelo não encontrado", { status: 404 });
  return new Response(m.dados, {
    headers: {
      "Content-Type": m.mime,
      "Content-Disposition": disposicao(baixar ? "attachment" : "inline", m.nome),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
