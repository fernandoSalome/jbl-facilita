import { json, withSession } from "@/lib/api";
import { desativarLinkEstudo, gerarLinkEstudo } from "@/lib/captacao-db";

/** Gera (ou devolve) o link público do estudo para mandar a um parceiro */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    try {
      return json({ token: await gerarLinkEstudo(params.id) });
    } catch (e) {
      return json({ error: (e as Error).message }, 404);
    }
  });
}

/** Desativa o link: quem tiver o endereço antigo não abre mais */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    await desativarLinkEstudo(params.id);
    return json({ ok: true });
  });
}
