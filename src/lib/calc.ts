/**
 * Motor de cálculo do estudo de parcelamento de solo.
 *
 * Reproduz as abas "Dados do Parcelamento de Solo" e "Carteira" da planilha
 * PLANILHA_ORÇAM_TERRENISTA_OFICIAL.xlsx. Cada campo indica a célula de origem.
 * Funções puras, sem dependência de banco ou tela: o teste em calc.test.ts
 * compara o resultado com os valores da planilha e do PDF da proposta.
 */

export type StudyInputs = {
  /** F5: tamanho da área (m²) */
  areaTotal: number;
  /** F6: aproveitamento (0–1) */
  aproveitamento: number;
  /** F9: metragem do lote (m²) */
  metragemLote: number;
  /** Frente do lote (m), só para exibir "8 × 25" */
  frenteLote: number;
  /** O4: valor do m² a ser comercializado (R$) */
  valorM2: number;
  /** O7: comissão do corretor (0–1) */
  corretorPct: number;
  /** W8: entrada (0–1) */
  entradaPct: number;
  /** O11: IPCA anual (0–1) */
  ipca: number;
  /** N13: juros ao mês (0–1) */
  jurosMes: number;
  /** Reajuste anual total digitado à mão. Quando vazio, usa N14 = IPCA + juros × 12 */
  reajusteManual: number | null;
  /** W13: multiplicador para encontrar a parcela */
  multiplicador: number;
  /** W14: em quantos anos ocorrerá o parcelamento */
  anos: number;
  /** F15: participação do incorporador (0–1). Terrenista = 1 − incorporador */
  incorporadorPct: number;
  /** Custo de infraestrutura por m² de área aproveitável (R$). Usado na proposta */
  custoInfraM2: number;
};

export const DEFAULT_INPUTS: StudyInputs = {
  areaTotal: 0,
  aproveitamento: 0.5,
  metragemLote: 200,
  frenteLote: 8,
  valorM2: 500,
  corretorPct: 0.06,
  entradaPct: 0.05,
  ipca: 0.04,
  jurosMes: 0.0067,
  reajusteManual: 0.12,
  multiplicador: 1.6,
  anos: 20,
  incorporadorPct: 0.65,
  custoInfraM2: 145,
};

/** Prazos da tabela "Outros Períodos de Parcelamento" (B21:B27), em meses */
export const PRAZOS_MESES = [36, 60, 96, 120, 180, 216, 240] as const;

export type Cenario = {
  meses: number;
  anos: number;
  /** E21: valor da parcela por lote no 1º ano */
  parcela: number;
  /** Parcela por lote no último ano, já reajustada */
  parcelaFinal: number;
  /** G21/J21/M21: arrecadação mensal nos 12 primeiros meses */
  mensalEmp: number;
  mensalInc: number;
  mensalTer: number;
  /** Arrecadação mensal do terrenista no último ano */
  mensalTerFinal: number;
  /** P21/S21/V21: arrecadação total da carteira */
  carteiraEmp: number;
  carteiraInc: number;
  carteiraTer: number;
  /** Parcela por lote ano a ano */
  parcelasPorAno: number[];
};

export type StudyResult = {
  inputs: StudyInputs;
  terrenistaPct: number;
  /** F7 */ areaUtil: number;
  /** F8 */ areaDoacao: number;
  /** F10 (fracionário, como na planilha) */ lotes: number;
  lotesInteiros: number;
  fundoLote: number;
  /** W5 */ valorLote: number;
  /** O8 */ comissao: number;
  /** W9 */ entrada: number;
  /** W11 */ entradaInc: number;
  /** W12 */ entradaTer: number;
  /** N14 (ou o valor manual) */ reajuste: number;
  reajusteCalculado: number;
  /** W15 */ nParcelas: number;
  /** W16 */ parcela: number;
  /** W17 */ valorLoteContrato: number;
  /** Carteira!E4/H4/K4 */
  vgvAvista: number;
  vgvAvistaInc: number;
  vgvAvistaTer: number;
  /** Carteira!E6/H6/K6: à vista descontada a comissão */
  vgvAvistaLiq: number;
  vgvAvistaLiqInc: number;
  vgvAvistaLiqTer: number;
  /** Custo das obras = área útil × custo/m² */
  custoInfra: number;
  /** Divisão mostrada na proposta: terrenista + JBL + infraestrutura = 100% */
  infraPct: number;
  jblPct: number;
  /** Carteira no prazo escolhido (VGV global projetado) */
  principal: Cenario;
  cenarios: Cenario[];
  /** Velocidade de vendas: 45% / 35% / 20% dos lotes nos 3 primeiros meses */
  vendas: { mes1: number; mes2: number; mes3: number; total: number };
};

function cenario(
  meses: number,
  saldoLote: number,
  multiplicador: number,
  lotes: number,
  reajuste: number,
  incPct: number,
): Cenario {
  const anos = Math.ceil(meses / 12);
  const parcela = (saldoLote * multiplicador) / meses;
  const parcelasPorAno: number[] = [];
  let p = parcela;
  let carteiraEmp = 0;
  for (let ano = 0; ano < anos; ano++) {
    parcelasPorAno.push(p);
    carteiraEmp += p * lotes * 12;
    p = p * reajuste + p; // planilha: =D12*N14+D12
  }
  const parcelaFinal = parcelasPorAno[parcelasPorAno.length - 1];
  const mensalEmp = parcela * lotes;
  const mensalInc = mensalEmp * incPct;
  return {
    meses,
    anos,
    parcela,
    parcelaFinal,
    mensalEmp,
    mensalInc,
    mensalTer: mensalEmp - mensalInc,
    mensalTerFinal: parcelaFinal * lotes * (1 - incPct),
    carteiraEmp,
    carteiraInc: carteiraEmp * incPct,
    carteiraTer: carteiraEmp * (1 - incPct),
    parcelasPorAno,
  };
}

export function calcular(input: Partial<StudyInputs>): StudyResult {
  const i: StudyInputs = { ...DEFAULT_INPUTS, ...input };
  const ter = 1 - i.incorporadorPct;

  const areaUtil = i.areaTotal * i.aproveitamento;
  const lotes = i.metragemLote > 0 ? areaUtil / i.metragemLote : 0;
  const valorLote = i.valorM2 * i.metragemLote;
  const comissao = i.corretorPct * valorLote;
  const entrada = i.entradaPct * valorLote;
  const reajusteCalculado = i.ipca + i.jurosMes * 12;
  const reajuste = i.reajusteManual ?? reajusteCalculado;
  const nParcelas = Math.round(i.anos * 12);
  const saldoLote = valorLote - entrada;
  const parcela = nParcelas > 0 ? (saldoLote * i.multiplicador) / nParcelas : 0;

  const vgvAvista = valorLote * lotes;
  const vgvAvistaLiq = vgvAvista - vgvAvista * i.corretorPct;
  const custoInfra = areaUtil * i.custoInfraM2;
  const infraPct = vgvAvista > 0 ? custoInfra / vgvAvista : 0;

  const prazos = Array.from(new Set<number>([...PRAZOS_MESES, nParcelas])).sort((a, b) => a - b);
  const cenarios = nParcelas > 0
    ? prazos.map((m) => cenario(m, saldoLote, i.multiplicador, lotes, reajuste, i.incorporadorPct))
    : [];
  const principal = cenarios.find((c) => c.meses === nParcelas) ?? cenario(1, 0, 0, 0, 0, 0);

  const total = Math.ceil(lotes);
  const mes1 = Math.round(total * 0.45);
  const mes2 = Math.round(total * 0.35);

  return {
    inputs: i,
    terrenistaPct: ter,
    areaUtil,
    areaDoacao: i.areaTotal - areaUtil,
    lotes,
    lotesInteiros: Math.floor(lotes),
    fundoLote: i.frenteLote > 0 ? i.metragemLote / i.frenteLote : 0,
    valorLote,
    comissao,
    entrada,
    entradaInc: (entrada - comissao) * i.incorporadorPct,
    entradaTer: (entrada - comissao) * ter,
    reajuste,
    reajusteCalculado,
    nParcelas,
    parcela,
    valorLoteContrato: parcela * nParcelas + entrada,
    vgvAvista,
    vgvAvistaInc: vgvAvista * i.incorporadorPct,
    vgvAvistaTer: vgvAvista * ter,
    vgvAvistaLiq,
    vgvAvistaLiqInc: vgvAvistaLiq * i.incorporadorPct,
    vgvAvistaLiqTer: vgvAvistaLiq * ter,
    custoInfra,
    infraPct,
    jblPct: i.incorporadorPct - infraPct,
    principal,
    cenarios,
    vendas: { mes1, mes2, mes3: total - mes1 - mes2, total },
  };
}
