import { json } from "@/lib/api";
import { senhaValida } from "@/lib/claude-ponte";
import { guardarTranscricao, proximoAudio } from "@/lib/contatos-terra-db";
import { baixarMidia } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Áudios das conversas particulares (pedido 20/11/2026). Rota só para a VPS: confere a senha antes de tudo.
 * GET entrega o próximo áudio (base64); POST devolve o texto transcrito pelo Whisper da VPS.
 */
export async function GET(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const a = await proximoAudio();
  if (!a) return json({ vazio: true });
  try {
    const midia = await baixarMidia(a.messageId);
    if (!midia?.base64) throw new Error("sem mídia");
    return json({ id: a.id, base64: midia.base64 });
  } catch {
    // áudio que o WhatsApp não entrega mais: marca e segue para o próximo
    await guardarTranscricao(a.id, null);
    return json({ vazio: true, pulado: a.id });
  }
}

export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));
  const id = typeof b.id === "string" ? b.id.slice(0, 40) : "";
  if (!id) return json({ error: "id" }, 400);
  await guardarTranscricao(id, typeof b.texto === "string" ? b.texto.slice(0, 20_000) : null);
  return json({ ok: true });
}
