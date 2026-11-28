import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { senhaValida } from "@/lib/claude-ponte";
import { documentoDoEstudo } from "@/lib/estudo-fontes";

export const dynamic = "force-dynamic";

/**
 * Documento que o estudo da VPS baixou (lei, mapa, certidão), pedido 26/11/2026: vai para a aba Documentos da
 * área. Rota pública só para a VPS: confere a senha antes de tudo; só aceita estudo das últimas 4 horas.
 */
export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const bruto = await req.text();
  if (bruto.length > 4_300_000) return json({ error: "Arquivo grande demais" }, 413);
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(bruto);
  } catch {
    return json({ error: "Dados inválidos" }, 400);
  }
  const id = typeof b.id === "string" ? b.id.slice(0, 40) : "";
  const c = await db.comandoClaude.findFirst({ where: { id, tipo: { in: ["estudo", "mercado"] }, status: { in: ["rodando", "feito"] }, iniciadoEm: { gt: new Date(Date.now() - 4 * 3600e3) } } });
  if (!c?.areaId) return json({ error: "Estudo não encontrado" }, 404);
  const doc = documentoDoEstudo(b.nome, b.base64);
  if ("erro" in doc) return json({ error: doc.erro }, 400);
  const messageId = `estudo-${c.id}-${doc.fileName}`.slice(0, 190);
  await db.projectDocument.upsert({
    where: { messageId },
    update: {},
    create: { areaId: c.areaId, tipo: doc.tipo, titulo: doc.titulo, fileName: doc.fileName, mime: doc.mime, size: doc.data.length, data: doc.data, origem: "estudo", enviadoPor: c.tipo === "estudo" ? "Viabilidade Legal (Claude)" : "Viabilidade Mercadológica (Claude)", messageId, avisadoEm: new Date() },
  });
  return json({ ok: true });
}
