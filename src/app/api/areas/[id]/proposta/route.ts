import { json, withSession } from "@/lib/api";
import { propostaDaArea } from "@/lib/captacao-db";

/** Cria (uma vez) a proposta da área com os dados dos estudos e devolve o id para abrir no editor */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    try {
      return json({ id: await propostaDaArea(params.id, s.sub) });
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  });
}
