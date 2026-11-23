import { json, withSession } from "@/lib/api";
import { ehTipoEstudo } from "@/lib/estudo-andamento";
import { pedirEstudoPelaTela } from "@/lib/estudo-andamento-db";

export const dynamic = "force-dynamic";

/** Botões "Fazer a Viabilidade Legal" / "Sim, fazer a Viabilidade Mercadológica": o estudo vai para a VPS (pedido 22/11/2026) */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => ({}));
    if (!ehTipoEstudo(b?.tipo)) return json({ error: "Tipo de estudo inválido" }, 400);
    try {
      await pedirEstudoPelaTela(params.id.slice(0, 40), b.tipo, s.name.slice(0, 80));
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}
