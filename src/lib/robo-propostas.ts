import { calcular } from "./calc";
import { db } from "./db";
import { fmtBRL, fmtDate, fmtM2, fmtNum, fmtPct } from "./format";
import { responderComDados } from "./ia";
import { displayStatus, parseInputs, parseOptions, STATUS } from "./proposals";

/**
 * Perguntas sobre as propostas no grupo de comandos ("qual o valor do lote no São Judas?").
 * Cada proposta vira uma ficha em texto com os números da planilha recalculados; a IA
 * responde a partir das fichas. Sem IA, o robô manda a ficha da proposta citada.
 */

const ORIGEM = () =>
  process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "https://jbl-facilita-production.up.railway.app");

const FORMATO: Record<string, string> = {
  loteamento_aberto: "Loteamento aberto",
  condominio_urbano: "Condomínio urbano",
  chacreamento_aberto: "Chacreamento aberto",
  chacreamento_condominio: "Chacreamento em condomínio",
};

type PropostaDb = Awaited<ReturnType<typeof buscar>>[number];

const buscar = (projectId?: string) =>
  db.proposal.findMany({
    where: { deletedAt: null, project: { deletedAt: null }, ...(projectId ? { projectId } : {}) },
    select: {
      name: true, ownerName: true, ownerPhone: true, formato: true, inputs: true, options: true, status: true, publicToken: true,
      publishedAt: true, expiresAt: true, viewCount: true, lastViewedAt: true, createdAt: true, updatedAt: true,
      project: { select: { name: true, municipio: true, uf: true, matricula: true, fase: true } },
      _count: { select: { letters: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
  });

export function ficha(p: PropostaDb): string {
  const r = calcular(parseInputs(p.inputs));
  const i = r.inputs;
  const o = parseOptions(p.options);
  const st = STATUS[displayStatus(p)]?.label ?? p.status;
  const pr = r.principal;
  const linhas = [
    `*${p.name}* · loteamento ${p.project.name} (${p.project.municipio}/${p.project.uf})${p.project.matricula ? ` · matrícula ${p.project.matricula}` : ""}`,
    `Terrenista: ${p.ownerName}${p.ownerPhone ? ` (${p.ownerPhone})` : ""} · formato ${FORMATO[p.formato] ?? p.formato}`,
    `Status: ${st} · criada ${fmtDate(p.createdAt)}${p.publishedAt ? ` · enviada ${fmtDate(p.publishedAt)}` : ""} · ${o.semValidade ? "não expira" : p.expiresAt ? `válida até ${fmtDate(p.expiresAt)}` : `validade ${o.validadeDias} dias`}`,
    `Visualizações: ${p.viewCount}${p.lastViewedAt ? ` (última ${fmtDate(p.lastViewedAt)})` : ""} · cartas de intenção: ${p._count.letters}`,
    `Área total ${fmtM2(i.areaTotal)} · aproveitamento ${fmtPct(i.aproveitamento)} · área útil ${fmtM2(r.areaUtil)} · doação ${fmtM2(r.areaDoacao)}`,
    `Lotes: ${r.lotesInteiros} de ${fmtM2(i.metragemLote, 0)} (${fmtNum(i.frenteLote, 0)} × ${fmtNum(r.fundoLote, 0)}) · m² a ${fmtBRL(i.valorM2)} · lote à vista ${fmtBRL(r.valorLote)}`,
    `Divisão: terrenista ${fmtPct(r.terrenistaPct)} · JBL ${fmtPct(i.incorporadorPct)} (na proposta: terrenista ${fmtPct(r.terrenistaPct)}, JBL ${fmtPct(r.jblPct)}, infraestrutura ${fmtPct(r.infraPct)})`,
    `Venda: entrada ${fmtPct(i.entradaPct)} (${fmtBRL(r.entrada)}) · ${r.nParcelas} parcelas de ${fmtBRL(r.parcela)} · valor do lote no contrato ${fmtBRL(r.valorLoteContrato)} · corretor ${fmtPct(i.corretorPct)}`,
    `Reajuste ${i.indice} ${fmtPct(i.ipca)} a.a. + juros ${fmtPct(i.jurosMes)} a.m. → reajuste anual ${fmtPct(r.reajuste)}`,
    `VGV à vista ${fmtBRL(r.vgvAvista)} (terrenista ${fmtBRL(r.vgvAvistaTer)}, JBL ${fmtBRL(r.vgvAvistaInc)}) · líquido de comissão ${fmtBRL(r.vgvAvistaLiq)}`,
    `Carteira em ${pr.anos} anos: total ${fmtBRL(pr.carteiraEmp)} · terrenista ${fmtBRL(pr.carteiraTer)} · JBL ${fmtBRL(pr.carteiraInc)}`,
    `Recebimento mensal do terrenista: ${fmtBRL(pr.mensalTer)} no 1º ano, ${fmtBRL(pr.mensalTerFinal)} no último · parcela do lote ${fmtBRL(pr.parcela)} → ${fmtBRL(pr.parcelaFinal)}`,
    `Outros prazos (carteira do terrenista): ${r.cenarios.map((c) => `${c.anos} anos ${fmtBRL(c.carteiraTer)}`).join("; ")}`,
    `Antecipação da carteira do terrenista (deságio ${fmtPct(i.desagio)}): ${fmtBRL(r.antecipacao.valor)}`,
    `Custo de infraestrutura: ${fmtBRL(r.custoInfra)} (${fmtBRL(i.custoInfraM2)}/m²)${r.etapa1 ? ` · 1ª etapa ${r.etapa1.lotes} lotes` : ""}`,
    `Vendas previstas: ${r.vendas.mes1} / ${r.vendas.mes2} / ${r.vendas.mes3} lotes nos 3 primeiros meses`,
    `Link: ${ORIGEM()}/p/${p.publicToken}`,
  ];
  return linhas.join("\n");
}

/** Resumo curto para quando não há IA */
function resumo(p: PropostaDb) {
  const r = calcular(parseInputs(p.inputs));
  const st = STATUS[displayStatus(p)]?.label ?? p.status;
  return [
    `📄 *${p.name}* (${p.project.name}) · ${st}`,
    `👤 ${p.ownerName}`,
    `📐 ${fmtM2(r.inputs.areaTotal, 0)} · ${r.lotesInteiros} lotes de ${fmtM2(r.inputs.metragemLote, 0)} · lote ${fmtBRL(r.valorLote)}`,
    `🤝 Terrenista ${fmtPct(r.terrenistaPct)} · JBL ${fmtPct(r.inputs.incorporadorPct)}`,
    `💰 VGV à vista ${fmtBRL(r.vgvAvista)} · carteira do terrenista em ${r.principal.anos} anos ${fmtBRL(r.principal.carteiraTer)}`,
    `🔗 ${ORIGEM()}/p/${p.publicToken}`,
  ].join("\n");
}

/** Responde a uma pergunta sobre propostas. projectId restringe ao loteamento citado. */
export async function responderProposta(pergunta: string, projectId?: string | null): Promise<string> {
  let props = await buscar(projectId ?? undefined);
  if (!props.length && projectId) props = await buscar();
  if (!props.length) return "Ainda não tem nenhuma proposta cadastrada no portal.";
  const fichas = props.map(ficha).join("\n\n---\n\n");
  const ia = await responderComDados(pergunta, fichas);
  if (ia) return ia;
  // sem IA: a ficha resumida das propostas encontradas
  return props.slice(0, 3).map(resumo).join("\n\n") + (props.length > 3 ? `\n\n…e mais ${props.length - 3}. Diga o nome do loteamento para eu filtrar.` : "");
}
