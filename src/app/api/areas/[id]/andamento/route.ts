import { json, withSession } from "@/lib/api";
import { salvarAndamento } from "@/lib/passo-a-passo-db";

export const dynamic = "force-dynamic";

/** Grava o passo a passo do proprietário (passos realizados, textos e notas) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const bruto = await req.text();
    if (bruto.length > 40_000) return json({ error: "Texto grande demais" }, 413);
    let corpo: unknown;
    try {
      corpo = JSON.parse(bruto);
    } catch {
      return json({ error: "Dados inválidos" }, 400);
    }
    try {
      await salvarAndamento(params.id, corpo);
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message }, 404);
    }
  });
}
