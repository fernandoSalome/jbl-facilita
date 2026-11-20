import { json, withSession } from "@/lib/api";
import { abrirProjetoDaArea } from "@/lib/captacao-db";

/** Contrato da SPE assinado: a área vira Projeto de Loteamento (aparece no seletor) */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    try {
      return json({ id: await abrirProjetoDaArea(params.id) });
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  });
}
