import { json, withSession } from "@/lib/api";
import { enviarAoContato } from "@/lib/contatos-terra-db";

export const dynamic = "force-dynamic";

/** Manda mensagem de WhatsApp pela tela de Conversas (limite próprio: 20 a cada 15 minutos) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const telefone = String(b.telefone ?? "").replace(/\D/g, "");
    const texto = typeof b.texto === "string" ? b.texto.trim().slice(0, 4000) : "";
    if (!/^\d{12,15}$/.test(telefone) || !texto) return json({ error: "Escreva a mensagem" }, 400);
    try {
      await enviarAoContato(telefone, texto);
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
    return json({ ok: true });
  });
}
