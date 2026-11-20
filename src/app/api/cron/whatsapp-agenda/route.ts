import { json } from "@/lib/api";
import { lembretesWhatsapp } from "@/lib/agenda-whatsapp";
import { enviarLembretes, respostasClaudePendentes, resumoDaManha } from "@/lib/rotinas-whatsapp";

export const dynamic = "force-dynamic";

/**
 * Lembretes do calendário no grupo de WhatsApp (1 dia e 1 hora antes). Chamada a cada ~10 minutos pelo
 * GitHub Actions (.github/workflows/lembretes-agenda.yml). Cada lembrete sai uma vez só, então chamar
 * de novo não repete mensagem.
 */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: "Não autorizado" }, 401);
  // cada rotina separada: se uma falhar (ou bater no limite de envio), as outras seguem
  const rodar = async <T>(f: () => Promise<T>) => f().catch((e: Error) => `erro: ${e.message.slice(0, 120)}`);
  return json({
    enviados: await rodar(() => lembretesWhatsapp()),
    lembretes: await rodar(() => enviarLembretes()),
    resumo: await rodar(() => resumoDaManha()),
    claude: await rodar(() => respostasClaudePendentes()),
  });
}
