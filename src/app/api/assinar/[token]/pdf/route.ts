import { cartaPorToken, sessaoOk } from "@/lib/assinatura";
import { nomeArquivo, pdfDaMinuta } from "@/lib/minuta-acoes";

export const maxDuration = 60;

/** PDF da minuta travada (para assinar no gov.br) ou, já assinada, a cópia assinada */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const c = await cartaPorToken(params.token);
  if (!c || c.minutaStatus === "revisao") return new Response("Link inválido", { status: 404 });
  if (!sessaoOk(c)) return new Response("Confirme o celular para abrir a carta", { status: 401 });
  if (new URL(req.url).searchParams.get("assinada") && c.pdfAssinado) {
    return new Response(Buffer.from(c.pdfAssinado), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo(c, true))}"` } });
  }
  const pdf = await pdfDaMinuta(c, true);
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${encodeURIComponent(nomeArquivo(c))}"`, "Cache-Control": "no-store" } });
}
