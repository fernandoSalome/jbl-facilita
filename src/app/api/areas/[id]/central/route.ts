import { json, withSession } from "@/lib/api";
import { perguntarNoCentral } from "@/lib/captacao-db";

/** Manda o resumo do Estudo 1 no grupo JBL - Central, com "Sigo para o mercadológico? 1 Sim · 2 Não" */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    try {
      await perguntarNoCentral(params.id);
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}
