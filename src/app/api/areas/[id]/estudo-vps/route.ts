import { json, withSession } from "@/lib/api";
import { ehTipoEstudo } from "@/lib/estudo-andamento";
import { pedirEstudoPelaTela, pedirOsDoisEstudos } from "@/lib/estudo-andamento-db";
import { pararEstudo, retomarEstudo } from "@/lib/estudo-parar-db";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Botões "Fazer a Viabilidade Legal" / "Sim, fazer a Viabilidade Mercadológica": o estudo vai para a VPS (pedido 22/11/2026) */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => ({}));
    // "os dois": a Legal agora e a Mercadológica logo depois (28/11/2026)
    if (!ehTipoEstudo(b?.tipo) && b?.tipo !== "os-dois") return json({ error: "Tipo de estudo inválido" }, 400);
    try {
      if (b.tipo === "os-dois") await pedirOsDoisEstudos(params.id.slice(0, 40), s.name.slice(0, 80));
      else await pedirEstudoPelaTela(params.id.slice(0, 40), b.tipo, s.name.slice(0, 80));
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}

/** "Parar estudo" e "Retomar" (pedido 23/11/2026): o aviso sai no grupo do pedido, como pelo WhatsApp */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const id = typeof b?.estudo === "string" ? b.estudo.slice(0, 40) : "";
    if (!id || (b?.acao !== "parar" && b?.acao !== "retomar")) return json({ error: "Dados inválidos" }, 400);
    const c = await db.comandoClaude.findFirst({ where: { id, areaId: params.id.slice(0, 40) }, select: { id: true } });
    if (!c) return json({ error: "Estudo não encontrado" }, 404);
    try {
      const r = b.acao === "parar" ? await pararEstudo(id) : await retomarEstudo(id);
      const { enviarTexto } = await import("@/lib/whatsapp");
      const g = await db.comandoClaude.findUnique({ where: { id }, select: { grupoJid: true } });
      if (g) await enviarTexto(g.grupoJid, `🤖 ${r.texto}`).catch(() => {});
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}
