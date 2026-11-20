import { json, withSession } from "@/lib/api";
import { ligarContato, marcarFora } from "@/lib/contatos-terra-db";

export const dynamic = "force-dynamic";

/** "Não é de terra" ou ligar a uma área */
export async function PATCH(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const id = typeof b.id === "string" ? b.id.slice(0, 40) : "";
    if (!id) return json({ error: "Contato inválido" }, 400);
    if (b.acao === "fora") {
      await marcarFora(id);
      return json({ ok: true });
    }
    if (b.acao === "ligar" && typeof b.areaId === "string") {
      try {
        await ligarContato(id, b.areaId.slice(0, 40));
      } catch (e) {
        return json({ error: (e as Error).message }, 404);
      }
      return json({ ok: true });
    }
    return json({ error: "Ação inválida" }, 400);
  });
}
