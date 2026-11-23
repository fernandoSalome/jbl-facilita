import { json } from "@/lib/api";
import { senhaValida } from "@/lib/claude-ponte";
import { db } from "@/lib/db";
import { lerAndamento } from "@/lib/estudo-andamento";

export const dynamic = "force-dynamic";

/** A VPS informa o andamento do estudo ("60 Calculando os lotes"), que aparece na tela (pedido 22/11/2026) */
export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));
  const id = typeof b?.id === "string" ? b.id.slice(0, 40) : "";
  const and = lerAndamento(typeof b?.linha === "string" ? b.linha.slice(0, 300) : null);
  if (!id || !and) return json({ error: "Dados inválidos" }, 400);
  await db.comandoClaude.updateMany({ where: { id, status: "rodando" }, data: and });
  return json({ ok: true });
}
