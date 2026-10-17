// Gera proposta-jbl.pdf a partir do index.html (mesmo processo usado no site original).
// Uso: na pasta do projeto ->  npm i -D playwright && npx playwright install chromium && node tools/gerar-pdf.js
const {chromium}=require('playwright');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const F=path.join(__dirname,'fonts');
(async()=>{
  const W=1180, A4=(210-30)*3.7795, scale=+(A4/W).toFixed(4);
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:W,height:1400}});
  await p.goto('file://'+path.join(ROOT,'index.html'),{waitUntil:'load'});
  await p.emulateMedia({media:'screen'});
  await p.addStyleTag({content:`
    @font-face{font-family:"PdfSerif";src:url(file://${F}/gelasio-latin-400-normal.woff2) format("woff2");font-weight:400}
    @font-face{font-family:"PdfSerif";src:url(file://${F}/gelasio-latin-700-normal.woff2) format("woff2");font-weight:700}
    @font-face{font-family:"PdfSerif";src:url(file://${F}/gelasio-latin-400-italic.woff2) format("woff2");font-style:italic}
    @font-face{font-family:"PdfSans";src:url(file://${F}/arimo-latin-400-normal.woff2) format("woff2");font-weight:400}
    @font-face{font-family:"PdfSans";src:url(file://${F}/arimo-latin-700-normal.woff2) format("woff2");font-weight:700}
    :root{--display:"PdfSerif",Georgia,serif;--body:"PdfSans","Helvetica Neue",Arial,sans-serif}
    #intencao,.nav,.burger,.mnav,.cover-ctas,.tabs,.dl,.dl-foot,.pdf-link,#pdf-msg{display:none!important}
    .progress{display:none!important}
    .step,.big-idea,#carta{scroll-margin:0}
    .calc,.tile,.card,.share,.faq>div,.person,.s6,.stages li,.tbl tr,.lot,.review,.tip,.note,.photo,.brand-card,.gantt-wrap,.pie-row,.vs,.next>div,.calc .sub,.bar,.df-grid,.letter p,.step-head,h3{break-inside:avoid;page-break-inside:avoid}
    .step-head,h2,h3,.part{break-after:avoid;page-break-after:avoid}
    .tbl{overflow:visible}
    section.step{padding-top:36px}
    .part{margin-top:48px}
    .cover{padding-bottom:28px}
    .end{margin-top:16px;padding-block:28px 20px}
    .dark-foot{padding-top:28px}
    .df-grid{padding-bottom:22px}
    .df-bottom{padding-block:10px}
    .dark-foot{break-inside:avoid;page-break-inside:avoid}
    #carta{break-before:page;page-break-before:always;margin-top:0}
    .chain{break-inside:avoid;page-break-inside:avoid;gap:20px}
    .chain .calc{padding-block:12px}
    .gantt-wrap{padding-block:10px}
    .bars{break-inside:avoid}
    .cover{border-bottom:0}
    .wrap,main.wrap,.end .wrap,.dark-foot .wrap,.df-bottom .wrap,.cover .wrap{padding-inline:0!important;max-width:none!important}
    .dark-foot,.end,.cover{border-radius:4px}
    .tile .v.v-big,.calc .f .res#v6,.calc .f .res#v7,.vgv-split .s-streets .vs-v,.tiles-rates .tile.gold .v,#r-total,.calc .f .res#v8,.rb-val{animation:none!important;transform:none!important;text-shadow:none!important}
    .fam-vals .fv-v{background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;color:#D9B467!important}
    .share-group{margin-right:68px}
  `});
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(600);
  await p.evaluate(()=>window.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(300);
  await p.pdf({path:path.join(ROOT,'proposta-jbl.pdf'),format:'A4',printBackground:true,scale,
    margin:{top:'15mm',bottom:'18mm',left:'15mm',right:'15mm'},displayHeaderFooter:true,
    headerTemplate:'<div></div>',
    footerTemplate:'<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#8a929b;padding:0 15mm;display:flex;justify-content:space-between"><span>Grupo JBL Incorporadora · Proposta de parceria São Judas Tadeu II · Martinópolis, SP</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>'});
  await b.close();
})();
