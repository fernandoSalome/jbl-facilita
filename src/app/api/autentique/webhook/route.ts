import { db } from "@/lib/db";
import { idsDoAviso, webhookAutentico } from "@/lib/autentique";
import { carregarCarta, sincronizarAssinaturas } from "@/lib/minuta-acoes";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Aviso da Autentique (alguém viu, assinou ou recusou). O conteúdo do aviso não é usado como verdade:
 * só serve para saber qual carta conferir; a situação é sempre lida de novo na própria Autentique.
 */
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!webhookAutentico(corpo, req.headers.get("x-autentique-signature"))) return new Response("assinatura inválida", { status: 401 });
  let json: unknown = null;
  try {
    json = JSON.parse(corpo);
  } catch {
    return new Response("ok");
  }
  const ids = idsDoAviso(json);
  if (!ids.length) return new Response("ok");
  const cartas = await db.intentLetter.findMany({ where: { autentiqueId: { in: ids }, minutaStatus: "enviada" }, select: { id: true } });
  for (const { id } of cartas) {
    const c = await carregarCarta(id);
    if (c) await sincronizarAssinaturas(c, true).catch((e) => console.error("autentique webhook", id, e));
  }
  return new Response("ok");
}
