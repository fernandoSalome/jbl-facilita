import { json, withSession } from "@/lib/api";
import { desativarLinkAndamento, gerarLinkAndamento } from "@/lib/passo-a-passo-db";

export const dynamic = "force-dynamic";

/** Gera (ou devolve) o link do passo a passo para mandar ao proprietário */
export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    try {
      return json({ token: await gerarLinkAndamento(params.id) });
    } catch (e) {
      return json({ error: (e as Error).message }, 404);
    }
  });
}

/** Desativa o link: quem tiver o endereço antigo não abre mais */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    await desativarLinkAndamento(params.id);
    return json({ ok: true });
  });
}
