import { json } from "@/lib/api";
import { senhaValida } from "@/lib/claude-ponte";
import { importarConversas } from "@/lib/contatos-terra-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Leitura automática das conversas particulares (pedido 20/11/2026). Rota só para a VPS (confere a senha antes):
 * a VPS chama de 20 em 20 minutos com "desde" (a última leitura) e vai pedindo as páginas até acabar.
 */
export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));
  const pagina = Number.isInteger(b.pagina) && b.pagina >= 0 && b.pagina < 1000 ? b.pagina : 0;
  const desde = typeof b.desde === "string" && !Number.isNaN(Date.parse(b.desde)) ? new Date(b.desde) : undefined;
  try {
    return json(await importarConversas(pagina, desde));
  } catch (e) {
    return json({ error: (e as Error).message.slice(0, 200) }, 502);
  }
}
