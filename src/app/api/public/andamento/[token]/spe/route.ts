import { andamentoPorToken } from "@/lib/passo-a-passo-db";
import { respostaModeloSpe } from "@/lib/modelo-spe-db";

export const dynamic = "force-dynamic";

/** Modelo da SPE para o proprietário: só com o link do passo a passo ativo (?baixar=1 baixa) */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  if (!(await andamentoPorToken(params.token))) return new Response("Link inválido", { status: 404 });
  return respostaModeloSpe(new URL(req.url).searchParams.get("baixar") === "1");
}
