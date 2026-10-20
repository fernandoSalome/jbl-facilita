import { db } from "./db";

/**
 * PDF da proposta: abre a página pública num Chromium sem tela e imprime em A4,
 * com o mesmo processo do site original (modelos/jbl-padrao/tools/gerar-pdf.js).
 * O arquivo fica guardado na proposta e só é refeito quando ela muda.
 */

const W = 1180;
const SCALE = +(((210 - 30) * 3.7795) / W).toFixed(4);

const CSS = `
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-400-normal.woff2) format("woff2");font-weight:400}
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-700-normal.woff2) format("woff2");font-weight:700}
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-400-italic.woff2) format("woff2");font-style:italic}
  @font-face{font-family:"PdfSans";src:url(/fonts/arimo-latin-400-normal.woff2) format("woff2");font-weight:400}
  @font-face{font-family:"PdfSans";src:url(/fonts/arimo-latin-700-normal.woff2) format("woff2");font-weight:700}
  .jblt{--display:"PdfSerif",Georgia,serif;--body:"PdfSans","Helvetica Neue",Arial,sans-serif}
  .jblt #intencao,.jblt .nav,.jblt .burger,.jblt .mnav,.jblt .cover-ctas,.jblt .tabs,.jblt .dl,.jblt .dl-foot,.jblt .progress{display:none!important}
  .jblt .calc,.jblt .tile,.jblt .card,.jblt .share,.jblt .faq>div,.jblt .s6,.jblt .tbl tr,.jblt .lot,.jblt .review,.jblt .tip,.jblt .note,.jblt .photo,.jblt .brand-card,.jblt .gantt-wrap,.jblt .pie-row,.jblt .next>div,.jblt .bar,.jblt .df-grid,.jblt .letter p,.jblt .step-head,.jblt h3{break-inside:avoid;page-break-inside:avoid}
  .jblt .step-head,.jblt h2,.jblt h3,.jblt .part{break-after:avoid;page-break-after:avoid}
  .jblt .tbl{overflow:visible}
  .jblt section.step{padding-top:36px}
  .jblt .part{margin-top:48px}
  .jblt .cover{padding-bottom:28px;border-bottom:0}
  .jblt .end{margin-top:16px;padding-block:28px 20px}
  .jblt .dark-foot{padding-top:28px;break-inside:avoid;page-break-inside:avoid}
  .jblt .df-grid{padding-bottom:22px}
  .jblt .df-bottom{padding-block:10px}
  .jblt #carta{break-before:page;page-break-before:always;margin-top:0}
  .jblt .chain{break-inside:avoid;page-break-inside:avoid;gap:20px}
  .jblt .chain .calc{padding-block:12px}
  .jblt .gantt-wrap{padding-block:10px}
  .jblt .bars{break-inside:avoid}
  .jblt .wrap,.jblt main.wrap,.jblt .end .wrap,.jblt .dark-foot .wrap,.jblt .df-bottom .wrap,.jblt .cover .wrap{padding-inline:0!important;max-width:none!important}
  .jblt .dark-foot,.jblt .end,.jblt .cover{border-radius:4px}
  .jblt .tile .v.v-big,.jblt .calc .f .res#v6,.jblt .calc .f .res#v7,.jblt .vgv-split .s-streets .vs-v,.jblt .tiles-rates .tile.gold .v,.jblt .calc .f .res#v8,.jblt .rb-val{animation:none!important;transform:none!important;text-shadow:none!important}
  .jblt .share-group{margin-right:68px}
`;

/** Chave que muda sempre que a proposta (ou o template aplicado a ela) muda; com data automática, também a cada dia */
export function pdfKeyOf(p: { updatedAt: Date; formatoVersionId: string | null; options?: unknown }) {
  const auto = (p.options as { data?: { modo?: string } } | null)?.data?.modo === "auto";
  const dia = auto ? `:${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "";
  return `${p.updatedAt.getTime()}:${p.formatoVersionId ?? ""}${dia}`;
}

export function contarPaginas(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

async function imprimir(origin: string, token: string, rodape: string, paginas?: number) {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: 1400 } });
    await page.goto(`${origin}/p/${token}?print=1${paginas ? `&pages=${paginas}` : ""}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.emulateMedia({ media: "screen" });
    await page.addStyleTag({ content: CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(300);
    const esc = rodape.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      scale: SCALE,
      margin: { top: "15mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#8a929b;padding:0 15mm;display:flex;justify-content:space-between"><span>${esc}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    });
  } finally {
    await browser.close();
  }
}

const emAndamento = new Map<string, Promise<{ data: Buffer; pages: number }>>();

/** Devolve o PDF da proposta (do cache, ou gera agora). O número de páginas entra no próprio texto da proposta. */
export async function pdfDaProposta(origin: string, token: string) {
  const p = await db.proposal.findFirst({ where: { publicToken: token, deletedAt: null }, include: { project: true } });
  if (!p) return null;
  const key = pdfKeyOf(p);
  if (p.pdfData && p.pdfKey === key && p.pdfPages) return { data: Buffer.from(p.pdfData), pages: p.pdfPages, name: p.project.name };

  let job = emAndamento.get(token);
  if (!job) {
    job = (async () => {
      const rodape = `Grupo JBL Incorporadora · Proposta de parceria ${p.project.name} · ${p.project.municipio}, ${p.project.uf}`;
      // 1ª impressão descobre o número de páginas; a 2ª já leva esse número no texto
      let pages = p.pdfPages ?? 0;
      let data = await imprimir(origin, token, rodape, pages || undefined);
      for (let i = 0; i < 2 && contarPaginas(data) !== pages; i++) {
        pages = contarPaginas(data);
        data = await imprimir(origin, token, rodape, pages);
      }
      pages = contarPaginas(data);
      // SQL direto para não mexer no updatedAt (que faz parte da chave)
      await db.$executeRaw`UPDATE "Proposal" SET "pdfData" = ${data}, "pdfPages" = ${pages}, "pdfKey" = ${key} WHERE id = ${p.id}`;
      return { data, pages };
    })().finally(() => emAndamento.delete(token));
    emAndamento.set(token, job);
  }
  const r = await job;
  return { ...r, name: p.project.name };
}
