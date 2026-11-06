import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { apresentacaoDe, linkApresentacao } from "@/lib/apresentacao/server";

/** Gerar link: guarda a versão atual (é o que o link mostra) e devolve o endereço para compartilhar */
export async function POST(_: Request, { params }: { params: { slug: string } }) {
  return withSession(async () => {
    const a = await apresentacaoDe(params.slug);
    if (!a) return json({ error: "Apresentação não encontrada" }, 404);
    // o link mostra só os números: as fórmulas e os ajustes ficam na edição
    const { modelo: _m, ajustes: _a, ...dados } = a.dados as Record<string, unknown>;
    const publicado = { dados, textos: a.textos, formatos: a.formatos, estilo: a.estilo };
    const p = await db.apresentacao.update({ where: { id: a.id }, data: { publicado: publicado as object, publicadoEm: new Date() } });
    return json({ url: linkApresentacao(p.token), publicadoEm: p.publicadoEm });
  });
}
