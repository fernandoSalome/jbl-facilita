import { json, withSession } from "@/lib/api";
import { loteamentoDaArea } from "@/lib/captacao-db";

/** Etapa Proposta: cria (uma vez) o loteamento da área e devolve o id para abrir as propostas */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const id = await loteamentoDaArea(params.id);
    return id ? json({ id }) : json({ error: "Área não encontrada" }, 404);
  });
}
