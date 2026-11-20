import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cortarResposta, senhaValida } from "@/lib/claude-ponte";
import { enviarTexto } from "@/lib/whatsapp";
import { guardarEstudoDaVps } from "@/lib/captacao-db";

export const dynamic = "force-dynamic";

/**
 * Fila do Claude da VPS (pedido 20/11/2026). Rota pública só para a VPS: confere a senha (CLAUDE_PONTE_SECRET)
 * antes de tudo. GET pega o próximo pedido; POST devolve a resposta, que vai para o grupo.
 */
export async function GET(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  // pedido que ficou "rodando" por mais de 40 minutos (VPS caiu): volta para a fila
  await db.comandoClaude.updateMany({ where: { status: "rodando", iniciadoEm: { lt: new Date(Date.now() - 40 * 60e3) } }, data: { status: "fila" } });
  const c = await db.comandoClaude.findFirst({ where: { status: "fila" }, orderBy: { createdAt: "asc" } });
  if (!c) return json({ vazio: true });
  const pego = await db.comandoClaude.updateMany({ where: { id: c.id, status: "fila" }, data: { status: "rodando", iniciadoEm: new Date() } });
  if (!pego.count) return json({ vazio: true });
  // estudo e mercado: vão junto os dados da área (KMZ e o que os estudos já definiram)
  const area = c.areaId
    ? await db.area.findFirst({ where: { id: c.areaId }, select: { id: true, nome: true, cidade: true, uf: true, hectares: true, poligono: true, estudo1: true, estudo2: true } })
    : null;
  return json({ id: c.id, texto: c.texto, autor: c.autor, tipo: c.tipo, area });
}

export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));
  const id = typeof b.id === "string" ? b.id.slice(0, 40) : "";
  const resposta = typeof b.resposta === "string" ? b.resposta.slice(0, 50_000) : "";
  const c = await db.comandoClaude.findFirst({ where: { id, status: "rodando" } });
  if (!c) return json({ error: "Pedido não encontrado" }, 404);
  // estudo pronto: a área recebe a viabilidade (campos do formulário e o estudo completo)
  let aviso = "";
  if (b.ok !== false && c.areaId && (c.tipo === "estudo" || c.tipo === "mercado")) {
    try {
      aviso = await guardarEstudoDaVps(c.areaId, c.tipo, b.estudo, typeof b.relatorioHtml === "string" ? b.relatorioHtml : "");
    } catch (e) {
      aviso = `\n\n⚠️ O estudo não entrou na plataforma: ${(e as Error).message.slice(0, 200)}`;
    }
  }
  await db.comandoClaude.update({ where: { id }, data: { status: b.ok === false ? "erro" : "feito", resposta: (resposta || "(sem resposta)") + aviso, terminadoEm: new Date() } });
  // manda já; se o limite de envio barrar, a rotina de 10 em 10 minutos tenta de novo
  try {
    await enviarTexto(c.grupoJid, `🤖 🧠 ${cortarResposta((resposta || "Não consegui responder agora.") + aviso)}`); // 🤖: o robô não lê de volta
    await db.comandoClaude.update({ where: { id }, data: { enviadoEm: new Date() } });
  } catch {}
  return json({ ok: true });
}
