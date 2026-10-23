import { pdfA4DaProposta, pdfDaProposta } from "@/lib/pdf";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * PDF da proposta: em slides (padrão, deitado) ou ?formato=a4 (em pé).
 * Com ?info=1 devolve só o número de páginas dos slides (gera se preciso).
 */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const url = new URL(req.url);
  const info = url.searchParams.has("info");
  const a4 = url.searchParams.get("formato") === "a4";
  // a impressão abre a própria página pública: por dentro do servidor no Railway; na Vercel, pelo endereço público
  const origin = process.env.VERCEL ? `https://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}` : `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    const r = a4 && !info ? await pdfA4DaProposta(origin, params.token) : await pdfDaProposta(origin, params.token);
    if (!r) return json({ error: "Proposta indisponível" }, 404);
    if (info) return json({ pages: r.pages });
    const nome = `Proposta JBL - ${r.name}${a4 ? " (A4)" : " (slides)"}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return new Response(new Uint8Array(r.data), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nome}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("pdf", e);
    return json({ error: "Não foi possível gerar o PDF agora." }, 503);
  }
}
