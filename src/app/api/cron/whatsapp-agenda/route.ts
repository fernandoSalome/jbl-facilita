import { json } from "@/lib/api";
import { lembretesWhatsapp } from "@/lib/agenda-whatsapp";

export const dynamic = "force-dynamic";

/**
 * Lembretes do calendário no grupo de WhatsApp (1 dia e 1 hora antes). Chamada a cada ~10 minutos pelo
 * GitHub Actions (.github/workflows/lembretes-agenda.yml). Cada lembrete sai uma vez só, então chamar
 * de novo não repete mensagem.
 */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: "Não autorizado" }, 401);
  return json({ enviados: await lembretesWhatsapp() });
}
