import { json, withSession } from "@/lib/api";
import { enviarNaConversa } from "@/lib/captacao-db";

/** Envia mensagem a uma conversa ligada (chat da área ou "perguntar a X" do professor) */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const texto = typeof b.texto === "string" ? b.texto.trim().slice(0, 2000) : "";
    if (!texto) return json({ error: "Escreva a mensagem" }, 400);
    try {
      await enviarNaConversa(params.id, String(b.conversaId ?? ""), texto);
      return json({ ok: true });
    } catch (e) {
      return json({ error: `Não foi possível enviar: ${(e as Error).message.slice(0, 200)}` }, 502);
    }
  });
}
