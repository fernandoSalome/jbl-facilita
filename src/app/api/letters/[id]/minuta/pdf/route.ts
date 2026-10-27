import { getSession } from "@/lib/auth";
import { carregarCarta, nomeArquivo, pdfDaMinuta } from "@/lib/minuta-acoes";

export const maxDuration = 60;

/** PDF da minuta (?assinada=1: o PDF assinado que a pessoa enviou) */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) return new Response("Não autenticado", { status: 401 });
  const c = await carregarCarta(params.id);
  if (!c) return new Response("Não encontrada", { status: 404 });
  if (new URL(req.url).searchParams.get("assinada")) {
    if (!c.pdfAssinado) return new Response("A carta ainda não foi assinada", { status: 404 });
    return new Response(Buffer.from(c.pdfAssinado), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(nomeArquivo(c, true))}"` } });
  }
  const pdf = await pdfDaMinuta(c, c.minutaStatus !== "revisao");
  return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(nomeArquivo(c))}"`, "Cache-Control": "no-store" } });
}
