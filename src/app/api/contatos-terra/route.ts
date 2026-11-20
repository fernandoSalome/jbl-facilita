import { json, withSession } from "@/lib/api";
import { importarConversas, ligarContato, marcarFora } from "@/lib/contatos-terra-db";

export const dynamic = "force-dynamic";
/** Ler as conversas antigas vai de 15 em 15; cada vez cabe no tempo da Vercel */
export const maxDuration = 60;

/** Ler as conversas antigas do WhatsApp (só admin; não manda nada) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const pagina = Number.isInteger(b.pagina) && b.pagina >= 0 && b.pagina < 1000 ? b.pagina : 0;
    try {
      return json(await importarConversas(pagina));
    } catch (e) {
      return json({ error: `Não consegui ler o WhatsApp: ${(e as Error).message.slice(0, 200)}` }, 502);
    }
  }, { admin: true });
}

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
