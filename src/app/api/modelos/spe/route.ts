import { json, withSession } from "@/lib/api";
import { erroDoModelo, LIMITE_MODELO } from "@/lib/modelo-spe";
import { respostaModeloSpe, salvarModeloSpe } from "@/lib/modelo-spe-db";

export const dynamic = "force-dynamic";

/** O modelo da SPE para a equipe conferir (?baixar=1 baixa) */
export async function GET(req: Request) {
  return withSession(async () => respostaModeloSpe(new URL(req.url).searchParams.get("baixar") === "1"));
}

/** Sobe (ou troca) o modelo da minuta da SPE: só administrador, só PDF até 4 MB */
export async function POST(req: Request) {
  return withSession(async (s) => {
    if (Number(req.headers.get("content-length") ?? 0) > LIMITE_MODELO + 64 * 1024) return json({ error: "O PDF deve ter até 4 MB." }, 413);
    const fd = await req.formData().catch(() => null);
    const f = fd?.get("arquivo");
    if (!(f instanceof File)) return json({ error: "Envie o arquivo." }, 400);
    const bytes = new Uint8Array(await f.arrayBuffer());
    const erro = erroDoModelo(bytes, f.name);
    if (erro) return json({ error: erro }, 400);
    await salvarModeloSpe(Buffer.from(bytes), f.name, s.name);
    return json({ ok: true });
  }, { admin: true });
}
