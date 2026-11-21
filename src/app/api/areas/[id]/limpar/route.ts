import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { limparConversa } from "@/lib/captacao";
import { extrairConversa } from "@/lib/captacao-db";

export const dynamic = "force-dynamic";

const MAX = 2 * 1024 * 1024;

/** "Limpar e extrair": recebe a conversa exportada do WhatsApp (.txt) e manda o que importa para o checklist */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const form = await req.formData().catch(() => null);
    const arq = form?.get("arquivo");
    const conversaId = String(form?.get("conversa") ?? "");
    if (!(arq instanceof File) || arq.size > MAX || !/\.txt$/i.test(arq.name)) return json({ error: "Envie o .txt da conversa exportada (até 2 MB)" }, 400);
    const c = await db.areaConversa.findFirst({ where: { id: conversaId, areaId: params.id }, select: { nome: true } });
    if (!c) return json({ error: "Conversa não encontrada" }, 404);
    const falas = limparConversa(await arq.text());
    const n = await extrairConversa(params.id, c.nome, falas);
    return json({ ok: true, falas: falas.length, n });
  });
}
