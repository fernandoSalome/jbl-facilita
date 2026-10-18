import { lerMensagem } from "@/lib/whatsapp";
import { tratarMensagem } from "@/lib/robo";

export const dynamic = "force-dynamic";

/** Recebe os eventos da Evolution API. O endereço leva uma chave (?k=) que só a Evolution conhece. */
export async function POST(req: Request) {
  const k = new URL(req.url).searchParams.get("k");
  if (!process.env.WA_WEBHOOK_SECRET || k !== process.env.WA_WEBHOOK_SECRET) return new Response("ok");
  const body = (await req.json().catch(() => null)) as { event?: string; data?: unknown } | null;
  if (!body || !/messages[._]upsert/i.test(body.event ?? "")) return new Response("ok");
  const lista = (Array.isArray(body.data) ? body.data : [body.data]) as Record<string, unknown>[];
  for (const d of lista) {
    const m = d && lerMensagem(d);
    // responde na hora para a Evolution e trata a mensagem em seguida
    if (m) tratarMensagem(m).catch((e) => console.error("robo", e));
  }
  return new Response("ok");
}
