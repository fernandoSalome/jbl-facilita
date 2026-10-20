import { db } from "./db";

/**
 * PDF da proposta em slides: página deitada 16:9 (13,333 × 7,5 pol., como um slide de
 * apresentação). A página pública é aberta num Chromium sem tela, cada seção vira um slide
 * (centralizado na altura); seção pouco maior que o slide é reduzida para caber, e seção
 * longa é dividida em vários slides ("continuação"), partindo tabelas por linhas.
 * O arquivo fica guardado na proposta e só é refeito quando ela muda.
 */

const W = 1280;
const PAGE = { w: 338.67, h: 190.5 }; // mm
const MARGIN = { top: 9, bottom: 13, side: 11 }; // mm
const SCALE = +(((PAGE.w - 2 * MARGIN.side) * 3.7795) / W).toFixed(4);
/** Altura útil de um slide em px da página (antes da escala), com folga para arredondamentos */
const SLIDE_H = Math.floor(((PAGE.h - MARGIN.top - MARGIN.bottom) * 3.7795) / SCALE) - 6;

const CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=block");
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-400-normal.woff2) format("woff2");font-weight:400}
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-700-normal.woff2) format("woff2");font-weight:700}
  @font-face{font-family:"PdfSerif";src:url(/fonts/gelasio-latin-400-italic.woff2) format("woff2");font-style:italic}
  @font-face{font-family:"PdfSans";src:url(/fonts/arimo-latin-400-normal.woff2) format("woff2");font-weight:400}
  @font-face{font-family:"PdfSans";src:url(/fonts/arimo-latin-700-normal.woff2) format("woff2");font-weight:700}
  .jblt{--display:"PdfSerif",Georgia,"Noto Color Emoji",serif;--body:"PdfSans","Helvetica Neue",Arial,"Noto Color Emoji",sans-serif}
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
  .jblt .pulsa,.jblt .pulsa *{animation:none!important;transform:none!important;text-shadow:none!important}
  .jblt section.step,.jblt .part,.jblt #carta,.jblt .big-idea,.jblt .end,.jblt .cover,.jblt .dark-foot{margin-top:0!important}
  .pdf-slide{height:var(--slide-h);display:flex;flex-direction:column;justify-content:center;overflow:hidden;break-after:page;page-break-after:always;box-sizing:border-box}
  .pdf-slide:last-child{break-after:auto;page-break-after:auto}
  .pdf-slide>.pdf-inner{width:100%;flex:none}
  .pdf-slide main.wrap{margin:0!important;padding:0!important}
  .pdf-cont{font-family:var(--body);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-deep);margin:0 0 14px}
  .pdf-slide .step{padding-top:0!important;border-top:0!important}
  .pdf-slide .hero-photo img{height:calc(var(--slide-h) * .5)!important;object-fit:cover}
  .pdf-slide .hero-photo{max-height:none}
`;

/** Chave que muda sempre que a proposta (ou o template aplicado a ela) muda; com data automática, também a cada dia */
export function pdfKeyOf(p: { updatedAt: Date; formatoVersionId: string | null; options?: unknown }) {
  const auto = (p.options as { data?: { modo?: string } } | null)?.data?.modo === "auto";
  const dia = auto ? `:${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "";
  return `slides:${p.updatedAt.getTime()}:${p.formatoVersionId ?? ""}${dia}`;
}

export function contarPaginas(pdf: Buffer) {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

async function imprimir(origin: string, token: string, rodape: string, paginas?: number) {
  const { chromium } = await import("playwright-core");
  // Na Vercel não há Chromium instalado: usa a versão compactada para funções sem servidor.
  // As funções da Vercel rodam no Amazon Linux 2023; a variável faz o pacote extrair as bibliotecas certas (libnss3...).
  if (process.env.VERCEL) process.env.AWS_LAMBDA_JS_RUNTIME ??= "nodejs20.x";
  const vercel = process.env.VERCEL ? (await import("@sparticuz/chromium")).default : null;
  const browser = await chromium.launch({
    executablePath: vercel ? await vercel.executablePath() : process.env.CHROMIUM_PATH || undefined,
    args: vercel ? vercel.args : ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage({ viewport: { width: W, height: 900 } });
    await page.goto(`${origin}/p/${token}?print=1${paginas ? `&pages=${paginas}` : ""}`, { waitUntil: "networkidle", timeout: 60000 });
    await page.emulateMedia({ media: "screen" });
    await page.addStyleTag({ content: CSS });
    // a fonte de emoji só baixa quando usada: carrega antes de medir e imprimir
    await page.evaluate(() => document.fonts.load('16px "Noto Color Emoji"', "🌳🏊").catch(() => null));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    await page.evaluate(montarSlides, { H: SLIDE_H });
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(400);
    const esc = rodape.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    return await page.pdf({
      width: `${PAGE.w}mm`,
      height: `${PAGE.h}mm`,
      printBackground: true,
      scale: SCALE,
      margin: { top: `${MARGIN.top}mm`, bottom: `${MARGIN.bottom}mm`, left: `${MARGIN.side}mm`, right: `${MARGIN.side}mm` },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#8a929b;padding:0 ${MARGIN.side}mm;display:flex;justify-content:space-between"><span>${esc}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`,
    });
  } finally {
    await browser.close();
  }
}

/**
 * Roda dentro da página (Chromium): reorganiza a proposta em slides de altura H.
 * Não pode usar nada de fora desta função (é enviada como texto para o navegador).
 *   - cada seção começa num slide novo; seções curtas seguidas dividem o mesmo slide
 *   - seção pouco maior que o slide é reduzida para caber
 *   - seção longa é distribuída em vários slides ("continuação"): título junto do bloco
 *     seguinte, bloco grande partido para preencher o espaço, sobra pequena volta ao anterior
 */
function montarSlides({ H }: { H: number }) {
  const raiz = document.querySelector<HTMLElement>(".jblt > div");
  if (!raiz) return;
  raiz.style.setProperty("--slide-h", `${H}px`);
  const altura = (el: Element) => el.getBoundingClientRect().height;
  const visivel = (el: Element) => getComputedStyle(el).display !== "none";

  type Unidade = { nos: HTMLElement[]; main: boolean; titulo: string };
  const unidades: Unidade[] = [];
  let rotulo: HTMLElement | null = null;
  for (const el of Array.from(raiz.children) as HTMLElement[]) {
    if (!visivel(el)) continue;
    if (el.tagName === "MAIN") {
      for (const filho of Array.from(el.children) as HTMLElement[]) {
        if (!visivel(filho)) continue;
        if (filho.classList.contains("part")) {
          rotulo = filho;
          continue;
        }
        const h2 = filho.querySelector(".step-head h2");
        const badge = filho.querySelector(".step-head .badge");
        unidades.push({ nos: rotulo ? [rotulo, filho] : [filho], main: true, titulo: h2 ? `${badge?.textContent ? `${badge.textContent} · ` : ""}${h2.textContent}` : "" });
        rotulo = null;
      }
    } else if (el.matches("header, footer, section")) {
      unidades.push({ nos: [el], main: false, titulo: el.querySelector("h2")?.textContent ?? "" });
    }
  }

  const caixa = document.createElement("div");
  caixa.className = "pdf-slides";
  raiz.appendChild(caixa);

  type Slide = { el: HTMLElement; inner: HTMLElement; main: boolean; zoom: boolean };
  let atual: Slide | null = null;

  function novoSlide(u: Unidade, continuacao: boolean): Slide {
    const el = document.createElement("div");
    el.className = "pdf-slide";
    const fundo = getComputedStyle(u.nos[u.nos.length - 1]).backgroundColor;
    if (fundo && fundo !== "rgba(0, 0, 0, 0)") el.style.background = fundo;
    const inner = document.createElement(u.main ? "main" : "div");
    inner.className = u.main ? "pdf-inner wrap" : "pdf-inner";
    if (continuacao && u.titulo) {
      const c = document.createElement("p");
      c.className = "pdf-cont";
      c.textContent = `${u.titulo} · continuação`;
      inner.appendChild(c);
    }
    el.appendChild(inner);
    caixa.appendChild(el);
    atual = { el, inner, main: u.main, zoom: false };
    return atual;
  }

  /** Reduz o conteúdo do slide para caber (alargando antes, para o texto ocupar a largura) */
  function reduzir(sl: Slide, minimo = 0.74) {
    const h = altura(sl.inner);
    if (h <= H) return true;
    const largura = sl.inner.getBoundingClientRect().width;
    let z = H / h;
    if (z < minimo) return false;
    for (let i = 0; i < 5 && altura(sl.inner) > H; i++) {
      sl.inner.style.width = `${largura / z}px`;
      sl.inner.style.zoom = String(z);
      z *= Math.min(0.995, H / altura(sl.inner));
      if (z < minimo * 0.95) break;
    }
    if (altura(sl.inner) <= H) return (sl.zoom = true);
    sl.inner.style.width = "";
    sl.inner.style.zoom = "";
    return false;
  }

  /** Divide um bloco em pedaços (cópias rasas com parte dos filhos / das linhas) de até `limite` */
  function partir(el: HTMLElement, limite: number): HTMLElement[] {
    if (altura(el) <= limite) return [el];
    const tabela = el.matches("table") ? (el as HTMLTableElement) : el.querySelector<HTMLTableElement>(":scope > table");
    if (tabela && tabela.tBodies[0]) {
      const linhas = Array.from(tabela.tBodies[0].rows);
      const pedacos: HTMLElement[] = [];
      const novo = () => {
        const bloco = el.cloneNode(false) as HTMLElement;
        const t = tabela === el ? (bloco as HTMLTableElement) : (tabela.cloneNode(false) as HTMLTableElement);
        if (t !== bloco) bloco.appendChild(t);
        if (tabela.tHead) t.appendChild(tabela.tHead.cloneNode(true));
        const corpo = document.createElement("tbody");
        t.appendChild(corpo);
        el.parentElement!.insertBefore(bloco, el);
        pedacos.push(bloco);
        return corpo;
      };
      let corpo = novo();
      for (const tr of linhas) {
        corpo.appendChild(tr);
        // o 1º pedaço usa o espaço que sobrou; os outros, um slide inteiro
        const lim = pedacos.length === 1 ? limite : H * 0.94;
        if (altura(pedacos[pedacos.length - 1]) > lim && corpo.rows.length > 1) {
          corpo.removeChild(tr);
          corpo = novo();
          corpo.appendChild(tr);
        }
      }
      el.remove();
      return pedacos;
    }
    const filhos = Array.from(el.children) as HTMLElement[];
    if (filhos.length <= 1) return [el];
    const pedacos: HTMLElement[] = [];
    let p: HTMLElement | null = null;
    for (const f of filhos) {
      if (!p) {
        p = el.cloneNode(false) as HTMLElement;
        el.parentElement!.insertBefore(p, el);
        pedacos.push(p);
      }
      p.appendChild(f);
      const lim = pedacos.length === 1 ? limite : H * 0.94;
      if (altura(p) > lim && p.children.length > 1) {
        p.removeChild(f);
        p = el.cloneNode(false) as HTMLElement;
        el.parentElement!.insertBefore(p, el);
        pedacos.push(p);
        p.appendChild(f);
      }
    }
    el.remove();
    return pedacos;
  }

  /** Coloca o bloco dentro de cópias rasas dos pais originais (seção, conteúdo), para o visual não mudar */
  type Orig = HTMLElement & { _orig?: HTMLElement };
  function colocar(b: HTMLElement, pais: HTMLElement[], destino: HTMLElement) {
    let alvo = destino;
    for (const p of pais) {
      const ult = alvo.lastElementChild as Orig | null;
      let copia = ult && ult._orig === p ? ult : null;
      if (!copia) {
        copia = p.cloneNode(false) as Orig;
        copia._orig = p;
        alvo.appendChild(copia);
      }
      alvo = copia;
    }
    alvo.appendChild(b);
  }
  /** Tira o bloco do slide (e as cópias de pais que ficarem vazias) */
  function tirar(b: HTMLElement, inner: HTMLElement) {
    let p = b.parentElement;
    b.remove();
    while (p && p !== inner && !p.children.length) {
      const pp: HTMLElement | null = p.parentElement;
      p.remove();
      p = pp;
    }
  }
  const usado = (sl: Slide) => altura(sl.inner);
  const titulo = (b: HTMLElement) => b.matches("h3, h4, .part, .step-head") || (b.children.length === 0 && b.matches("p") && altura(b) < 40);

  for (const u of unidades) {
    // mede a seção inteira num slide novo
    const prev = atual as Slide | null;
    const sl = novoSlide(u, false);
    for (const n of u.nos) sl.inner.appendChild(n);
    const h = altura(sl.inner);

    // seção curta: divide o slide anterior, se couber e ele estiver pela metade
    if (prev && prev.main === u.main && !prev.zoom && h <= H - usado(prev) - 16 && usado(prev) < H * 0.6) {
      for (const n of u.nos) prev.inner.appendChild(n);
      sl.el.remove();
      atual = prev;
      continue;
    }
    if (h <= H) continue;
    if (h <= H * 1.3 && reduzir(sl)) continue;

    // longa: distribui os blocos
    const blocos: { b: HTMLElement; pais: HTMLElement[] }[] = [];
    const juntar = (el: HTMLElement, pais: HTMLElement[]) => {
      if (el.matches("section, footer, header, article, div.big-idea, .content, .wrap")) {
        for (const c of Array.from(el.children) as HTMLElement[]) juntar(c, [...pais, el]);
      } else blocos.push({ b: el, pais });
    };
    for (const n of u.nos) juntar(n, []);
    for (const n of u.nos) n.remove();
    sl.el.remove();
    let s = novoSlide(u, false);
    const slidesDaSecao: Slide[] = [s];

    for (let i = 0; i < blocos.length; i++) {
      const { b, pais } = blocos[i];
      colocar(b, pais, s.inner);
      if (usado(s) <= H) continue;
      const antes = usado(s) - altura(b);
      const sobra = H - antes - 8;
      // bloco grande: parte para preencher o que sobrou do slide
      if (sobra > H * 0.28 && (b.querySelector("table") || b.children.length > 1)) {
        const pedacos = partir(b, sobra);
        if (pedacos.length > 1 && altura(pedacos[0]) <= sobra + 8) {
          for (let j = pedacos.length - 1; j >= 1; j--) {
            tirar(pedacos[j], s.inner);
            blocos.splice(i + 1, 0, { b: pedacos[j], pais });
          }
          continue;
        }
      }
      tirar(b, s.inner);
      // título no fim do slide vai junto com o bloco
      const leva: { b: HTMLElement; pais: HTMLElement[] }[] = [];
      while (i - leva.length - 1 >= 0) {
        const anterior = blocos[i - leva.length - 1];
        if (!titulo(anterior.b) || !s.inner.contains(anterior.b)) break;
        leva.unshift(anterior);
      }
      if (leva.length && leva.length < s.inner.querySelectorAll("*").length) for (const t of leva) tirar(t.b, s.inner);
      else leva.length = 0;
      s = novoSlide(u, true);
      slidesDaSecao.push(s);
      for (const t of leva) colocar(t.b, t.pais, s.inner);
      colocar(b, pais, s.inner);
      if (usado(s) > H) {
        // sozinho maior que o slide: parte, ou reduz
        const pedacos = partir(b, H - (usado(s) - altura(b)) - 8);
        for (let j = pedacos.length - 1; j >= 1; j--) {
          tirar(pedacos[j], s.inner);
          blocos.splice(i + 1, 0, { b: pedacos[j], pais });
        }
        if (usado(s) > H) reduzir(s, 0.5);
      }
    }

    // sobra pequena no último slide: volta para o anterior, reduzindo um pouco
    if (slidesDaSecao.length > 1) {
      const ult = slidesDaSecao[slidesDaSecao.length - 1];
      const pen = slidesDaSecao[slidesDaSecao.length - 2];
      const conteudo = Array.from(ult.inner.children).filter((c) => !c.classList.contains("pdf-cont")) as HTMLElement[];
      if (conteudo.reduce((t, c) => t + altura(c), 0) < H * 0.3 && !pen.zoom) {
        for (const c of conteudo) pen.inner.appendChild(c);
        if (reduzir(pen, 0.72)) ult.el.remove();
        else for (const c of conteudo) ult.inner.appendChild(c);
      }
      atual = slidesDaSecao[slidesDaSecao.length - 1].el.isConnected ? slidesDaSecao[slidesDaSecao.length - 1] : pen;
    }
  }
  for (const el of Array.from(raiz.children)) if (el !== caixa) (el as HTMLElement).style.display = "none";
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
