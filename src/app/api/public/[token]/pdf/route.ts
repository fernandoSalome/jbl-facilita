import { pdfDaProposta } from "@/lib/pdf";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** PDF A4 da proposta. Com ?info=1 devolve só o número de páginas (gera se preciso). */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const info = new URL(req.url).searchParams.has("info");
  // a impressão abre a própria página pública: por dentro do servidor no Railway; na Vercel, pelo endereço público
  const origin = process.env.VERCEL ? `https://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}` : `http://127.0.0.1:${process.env.PORT || 3000}`;
  try {
    const r = await pdfDaProposta(origin, params.token);
    if (!r) return json({ error: "Proposta indisponível" }, 404);
    if (info) return json({ pages: r.pages });
    const nome = `Proposta JBL - ${r.name}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return new Response(new Uint8Array(r.data), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nome}"`, "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("pdf", e);
    return json({ error: "Não foi possível gerar o PDF agora." }, 503);
  }
}
