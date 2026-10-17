import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { fmtLongDate } from "@/lib/format";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type LetterData = {
  proprietario?: Record<string, string>;
  casamento?: Record<string, string>;
  conjuge?: Record<string, string>;
  imovel?: Record<string, string>;
  interesse?: Record<string, string>;
  local?: string;
  data?: string;
  matricula?: { name: string; type: string; data: string } | null;
};

/** Carta de intenção preenchida, pronta para imprimir ou salvar em PDF. ?anexo=1 baixa a matrícula. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await getSession())) return new Response("Não autenticado", { status: 401 });
  const l = await db.intentLetter.findUnique({ where: { id: params.id }, include: { proposal: { include: { project: true } } } });
  if (!l) return new Response("Não encontrada", { status: 404 });
  const d = l.data as LetterData;

  if (new URL(req.url).searchParams.get("anexo") && d.matricula?.data) {
    const [, meta, b64] = d.matricula.data.match(/^data:([^;]+);base64,(.*)$/) ?? [];
    if (!b64) return new Response("Anexo inválido", { status: 400 });
    return new Response(Buffer.from(b64, "base64"), {
      headers: { "Content-Type": meta, "Content-Disposition": `inline; filename="${encodeURIComponent(d.matricula.name)}"` },
    });
  }

  if (new URL(req.url).searchParams.get("formato") === "json") {
    const { matricula, ...resto } = d;
    return Response.json({
      protocolo: l.protocolo,
      createdAt: l.createdAt,
      proposta: l.proposal.name,
      projeto: `${l.proposal.project.name} · ${l.proposal.project.municipio} - ${l.proposal.project.uf}`,
      dados: resto,
      anexo: matricula?.name ?? null,
    });
  }

  const row = (k: string, v?: string) => `<div class="f"><span>${esc(k)}</span><b>${esc(v) || "&nbsp;"}</b></div>`;
  const p = d.proprietario ?? {}, c = d.casamento ?? {}, j = d.conjuge ?? {}, i = d.imovel ?? {};
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Carta de intenção ${esc(l.protocolo)}</title>
<style>
body{font-family:"Helvetica Neue",Arial,sans-serif;color:#2B3A4A;max-width:820px;margin:32px auto;padding:0 24px;line-height:1.5}
h1{font-family:Georgia,serif;font-weight:400;color:#122A45;font-size:28px;margin:18px 0 6px}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#A2782F;border-bottom:1px solid #C1943D;padding-bottom:6px;margin:26px 0 10px}
.top{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #C1943D;padding-bottom:14px}
.top img{height:54px}.proto{font-family:Georgia,serif;color:#122A45;font-size:18px;text-align:right}.proto small{display:block;font:12px Arial;color:#697683}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px}.f{border-bottom:1px solid #DDE3E9;padding:4px 0}.f span{display:block;font-size:11px;color:#697683;text-transform:uppercase;letter-spacing:.06em}.f b{font-weight:600;color:#122A45}
p.decl{background:#F7F2E7;border-left:3px solid #C1943D;padding:12px 14px;font-size:14px}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px}.sig div{border-top:1px solid #122A45;padding-top:6px;text-align:center;font-size:13px}
.bar{display:flex;gap:10px;margin:20px 0}.bar a,.bar button{font:600 14px Arial;padding:9px 14px;border-radius:4px;border:1px solid #122A45;background:#122A45;color:#fff;text-decoration:none;cursor:pointer}.bar a{background:#fff;color:#122A45}
@media print{.bar{display:none}body{margin:0}}
</style></head><body>
<div class="bar"><button onclick="print()">Imprimir / salvar PDF</button>${d.matricula?.data ? `<a href="?anexo=1" target="_blank">📎 Ver matrícula anexada (${esc(d.matricula.name)})</a>` : ""}</div>
<div class="top"><img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora"><div class="proto">${esc(l.protocolo)}<small>Recebida em ${esc(fmtLongDate(l.createdAt))}</small></div></div>
<h1>Termo de aceite para carta de intenção</h1>
<div style="color:#697683">${esc(l.proposal.project.name)} · ${esc(l.proposal.project.municipio)} - ${esc(l.proposal.project.uf)} · Proposta “${esc(l.proposal.name)}”</div>
<p class="decl">Por meio deste instrumento, declaramos nosso consentimento para a elaboração da Carta de Intenção, devidamente assinada, e nos comprometemos a fornecer todas as informações e documentos solicitados, a fim de possibilitar à JBL Incorporadora e Urbanismo o prosseguimento dos estudos e da análise de viabilidade técnica, jurídica, ambiental, comercial e econômica do empreendimento em questão.</p>
<h2>Dados do proprietário</h2><div class="grid">${row("Nome completo", p.nome)}${row("CPF", p.cpf)}${row("RG", p.rg)}${row("Nacionalidade", p.nacionalidade)}${row("Profissão", p.profissao)}${row("Endereço", p.endereco)}${row("Telefone", p.telefone)}${row("E-mail", p.email)}</div>
<h2>Informações matrimoniais</h2><div class="grid">${row("Estado civil", c.estadoCivil)}${row("Data do casamento", c.data)}${row("Regime de bens", c.regime)}${row("Matrícula", c.matricula)}${row("RCPN", c.rcpn)}${row("Município / comarca", c.municipio)}${row("Observações", c.observacoes)}</div>
<h2>Dados do cônjuge</h2><div class="grid">${row("Nome completo", j.nome)}${row("CPF", j.cpf)}${row("RG", j.rg)}${row("Nacionalidade", j.nacionalidade)}${row("Profissão", j.profissao)}</div>
<h2>Imóvel</h2><div class="grid">${row("Área total (ha)", i.areaHa)}${row("Zona", i.zona)}${row("Município", i.municipio)}${row("Cartório de Registro de Imóveis", i.cartorio)}${row("Matrícula(s)", i.matriculas)}${row("CAR(s)", i.car)}</div>
${d.interesse ? `<h2>Interesse</h2><div class="grid">${row("Modalidade", d.interesse.modalidade)}${row("Prazo de vendas", d.interesse.prazo)}${row("Reunião", d.interesse.reuniao)}${row("Observações", d.interesse.observacoes)}</div>` : ""}
<div class="grid" style="margin-top:14px">${row("Local", d.local)}${row("Data", d.data)}</div>
<div class="sig"><div>Assinatura do proprietário</div><div>Assinatura do cônjuge</div></div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
