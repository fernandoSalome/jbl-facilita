/**
 * Motor de cálculo do estudo de parcelamento de solo.
 *
 * Reproduz as abas "Dados do Parcelamento de Solo" e "Carteira" da planilha
 * PLANILHA_ORÇAM_TERRENISTA_OFICIAL.xlsx. Cada campo indica a célula de origem.
 * Os campos marcados "azul" são os que o Marcelo preenche na planilha; o resto
 * a planilha calcula. Funções puras: calc.test.ts compara com a planilha, com o
 * PDF e com o site da proposta São Judas Tadeu II.
 */

export const INDICES = ["IPCA", "IGPM", "INCC"] as const;

export type StudyInputs = {
  /** F5 (azul): tamanho da área (m²) */
  areaTotal: number;
  /** F6 (azul): aproveitamento (0–1) */
  aproveitamento: number;
  /** F9 (azul): metragem do lote (m²) */
  metragemLote: number;
  /** F15 (azul): participação do incorporador (0–1). Terrenista = 1 − incorporador */
  incorporadorPct: number;
  /** O4 (azul): valor do m² a ser comercializado (R$) */
  valorM2: number;
  /** O7 (azul): comissão do corretor (0–1) */
  corretorPct: number;
  /** N11 (azul): nome do índice financeiro */
  indice: string;
  /** O11 (azul): índice financeiro ao ano (0–1) */
  ipca: number;
  /** N12 (azul): juros ao ano (0–1) */
  jurosAno: number;
  /** N13 (azul): juros ao mês (0–1) */
  jurosMes: number;
  /** N17 (azul): valor da área (R$) */
  valorArea: number;
  /** W8 (azul): entrada (0–1) */
  entradaPct: number;
  /** W13 (azul): multiplicador para encontrar a parcela */
  multiplicador: number;
  /** W14 (azul): em quantos anos ocorrerá o parcelamento */
  anos: number;
  /** G33 (azul): Plano de Venda 02, entrada incorporador/terrenista (0–1) */
  entradaIncTerPct: number;
  /** G34 (azul): Plano de Venda 02, parcela até a entrega (0–1) */
  parcelaEntregaPct: number;
  /** G35 (azul): Plano de Venda 02, balão na entrega do empreendimento (0–1) */
  balaoPct: number;

  // ----- Não estão na planilha; usados na proposta -----
  /** Frente do lote (m), para exibir "8 × 25". Aba "Custo" F50: entra na rede de energia */
  frenteLote: number;
  /** Aba "Custo" F48: vias (% da área total). Vazio = metade da área que não é aproveitável */
  viasPct: number | null;
  /** Aba "Custo" F54: largura da via, média em metros (rua + calçadas) */
  larguraVia: number;
  /** Aba "Custo" F55: largura de cada calçada, média em metros */
  larguraCalcada: number;
  /**
   * Fórmulas de obra da planilha nova (JBL Planilha Infla, 2026): vem do tipo de loteamento
   * (template), não é digitado. Vazio = as da planilha anterior (aba Custo).
   */
  planilhaInfra?: "2026" | null;
  /** Custo de infraestrutura por m² de área aproveitável (R$) */
  custoInfraM2: number;
  /** Extensão da rede principal de água/esgoto (m). Vazio = estimativa pela área */
  extensaoRede: number | null;
  /** Lotes da primeira etapa (legado: antes da opção de desmembramento). Vazio = sem primeira etapa */
  lotesEtapa1: number | null;
  /** Tem primeira etapa (desmembramento): mostra a seção "A primeira etapa" na proposta */
  primeiraEtapa: boolean;
  /** Primeira etapa: tamanho da área desmembrada (m²) */
  areaEtapa1: number | null;
  /** Primeira etapa: metragem do lote (m²). Vazio = a mesma do estudo */
  loteEtapa1: number | null;
  /** Primeira etapa: valor do m² do lote (R$). Obrigatório: vazio = a etapa não é calculada (não usa o do estudo) */
  valorM2Etapa1: number | null;
  /** Primeira etapa existente, mas sem os números: a proposta mostra "a definir" */
  etapaADefinir?: boolean;
  /** Primeira etapa (uma linha de quadras): comprimento da área perimetral (m) */
  areaPerimetralE1: number | null;
  /** Primeira etapa: largura da rua (m) */
  ruaE1: number | null;
  /** Primeira etapa: outras medidas a descontar do perímetro (m): tiram lotes, a área da etapa não muda */
  descontoE1: number | null;
  /** Primeira etapa: quantidade de ruas obrigatórias (× largura da rua, sai do perímetro como o desconto) */
  ruasObrigE1: number | null;
  /** Primeira etapa: comprimento da quadra (m) */
  compQuadraE1: number | null;
  /** Primeira etapa: frente do lote (m) */
  frenteE1: number | null;
  /** Deságio médio na antecipação de recebíveis (0–1) */
  desagio: number;
  /** Taxa mensal da aplicação financeira simulada (0–1) */
  taxaAplicacao: number;
  /**
   * Reajuste anual digitado à mão (legado). Quando preenchido substitui a fórmula
   * da planilha. O PDF de jan/2026 usou 12% fixo.
   */
  reajusteManual: number | null;
};

export const DEFAULT_INPUTS: StudyInputs = {
  areaTotal: 0,
  aproveitamento: 0.5,
  metragemLote: 200,
  incorporadorPct: 0.6,
  valorM2: 500,
  corretorPct: 0.05,
  indice: "IPCA",
  ipca: 0.045,
  jurosAno: 0,
  jurosMes: 0.0067,
  valorArea: 0,
  entradaPct: 0.06,
  multiplicador: 1.68,
  anos: 20,
  entradaIncTerPct: 0.08,
  parcelaEntregaPct: 0.27,
  balaoPct: 0.05,
  frenteLote: 8,
  viasPct: null,
  larguraVia: 12,
  larguraCalcada: 2,
  custoInfraM2: 145,
  extensaoRede: null,
  lotesEtapa1: null,
  primeiraEtapa: false,
  areaEtapa1: null,
  loteEtapa1: null,
  valorM2Etapa1: null,
  areaPerimetralE1: null,
  ruaE1: null,
  descontoE1: null,
  ruasObrigE1: null,
  compQuadraE1: null,
  frenteE1: null,
  desagio: 0.66667,
  taxaAplicacao: 0.01,
  reajusteManual: null,
};

/** Prazos da tabela "Outros Períodos de Parcelamento" + 13 anos da proposta, em meses */
export const PRAZOS_MESES = [36, 60, 96, 120, 156, 180, 216, 240] as const;

/** Quantidades medidas no estudo da gleba São Judas Tadeu II (137.338,46 m², 343,346 lotes), usadas como proporção */
const BASE = { area: 137338.46, lotes: 343.34615, rede: 2977.96, ligacoes: 2060, logradouros: 23823.64, eletrica: 3275.75, guias: 5955.91, calcadas: 11911.82 };

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

type Rateio = { total: number; inc: number; ter: number; pct: number };

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
  /** W10 */ entradaCorretor: number;
  /** W11 */ entradaInc: number;
  /** W12 */ entradaTer: number;
  /** N14 (ou o valor manual) */ reajuste: number;
  reajusteCalculado: number;
  /** W15 */ nParcelas: number;
  /** W16 */ parcela: number;
  /** W17 */ valorLoteContrato: number;
  /** Saldo financiado a prazo: (lote − entrada) × multiplicador */
  saldoPrazo: number;
  /** VGV a prazo antes da projeção: saldo a prazo × lotes */
  vgvPrazoSemReajuste: number;
  /** Carteira!E4/H4/K4 */
  vgvAvista: number;
  vgvAvistaInc: number;
  vgvAvistaTer: number;
  /** Carteira!E6/H6/K6: à vista descontada a comissão */
  vgvAvistaLiq: number;
  vgvAvistaLiqInc: number;
  vgvAvistaLiqTer: number;
  /** Custo das obras = área útil (m² inteiros) × custo/m² */
  areaObras: number;
  custoInfra: number;
  /** Divisão mostrada na proposta: terrenista + JBL + infraestrutura = 100% */
  infraPct: number;
  jblPct: number;
  /** Carteira no prazo escolhido (VGV global projetado) */
  principal: Cenario;
  cenarios: Cenario[];
  /** Velocidade de vendas: 45% / 35% / 20% dos lotes nos 3 primeiros meses */
  vendas: { mes1: number; mes2: number; mes3: number; total: number };
  /** Quantidades médias de infraestrutura, a partir da extensão da rede principal */
  /** Quantidades de obra: rede, ligações, ruas, energia e árvores pela aba "Custo" da planilha; guias e calçadas pela proporção com o São Judas */
  infra: { rede: number; ligacoes: number; logradouros: number; eletrica: number; guias: number; calcadas: number; arvores: number; reservatorio: number; casaQuimica: number };
  /**
   * Primeira etapa (desmembramento): lotes digitados; pct = lotes × lote ÷ área aproveitável;
   * à vista = lotes × lote × m² da etapa; a prazo com o financiamento do estudo.
   */
  etapa1: {
    lotes: number; lote: number; valorM2: number; areaUtil: number; pct: number; avista: number; prazo: number;
    /** Pelas medidas da fileira de quadras (null = proposta sem as medidas) */
    quadras: {
      linha: number; rua: number; fundo: number; frente: number; comp: number;
      /** quadras inteiras e lotes em cada uma; quadra menor no final (0 = não há) */
      cheias: number; porQuadra: number; resto: number; lotesResto: number; quarteiroes: number; lotesBrutos: number;
      /** perímetro digitado, desconto (m) e a linha onde cabem os lotes: linha = perímetro − desconto */
      perimetro: number; desconto: number; ruasEntre: number;
      /** ruas obrigatórias: quantidade e metros (quantidade × largura da rua), tirados do perímetro */
      ruasObrig: number; obrigM: number;
      /** áreas (m²): a área da etapa é perímetro × fundo (o desconto não muda a área, só os lotes) */
      areaLotes: number; areaRuas: number; sobra: number; areaTotal: number;
    } | null;
  } | null;
  /** Primeira etapa marcada como existente, mas a definir (sem números) */
  etapa1ADefinir: boolean;
  /** 1ª etapa ligada, mas sem o valor do m² do lote da etapa: não é calculada */
  etapa1FaltaValor: boolean;
  /** Antecipação de recebíveis da carteira do terrenista no prazo escolhido */
  antecipacao: { carteira: number; valor: number; jurosMes1: number; multiplicador: number; rentabilidade: number; ultimaBase: number };
  /** Plano de Venda 02 (linhas 29–40 da planilha) */
  plano02: {
    lote: Rateio;
    corretagem: Rateio;
    entrada: Rateio;
    parcelaEntrega: Rateio;
    balao: Rateio;
    remanescente: Rateio;
    parcelaRemanescente: { total: number; inc: number; ter: number };
    valorFinalLote: { total: number; inc: number; ter: number };
    totalCarteira: { total: number; inc: number; ter: number };
  };
};

function cenario(meses: number, saldoLote: number, multiplicador: number, lotes: number, reajuste: number, incPct: number): Cenario {
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
  const inc = i.incorporadorPct;
  const ter = 1 - inc;
  const rateio = (total: number, pct: number): Rateio => ({ total, inc: total * inc, ter: total - total * inc, pct });

  const areaUtil = i.areaTotal * i.aproveitamento;
  const lotes = i.metragemLote > 0 ? areaUtil / i.metragemLote : 0;
  const valorLote = i.valorM2 * i.metragemLote;
  const comissao = i.corretorPct * valorLote;
  const entrada = i.entradaPct * valorLote;
  const reajusteCalculado = i.ipca + i.jurosAno + i.jurosMes * 12;
  const reajuste = i.reajusteManual ?? reajusteCalculado;
  const nParcelas = Math.round(i.anos * 12);
  const saldoLote = valorLote - entrada;
  const parcela = nParcelas > 0 ? (saldoLote * i.multiplicador) / nParcelas : 0;
  const saldoPrazo = saldoLote * i.multiplicador;

  const vgvAvista = valorLote * lotes;
  const vgvAvistaLiq = vgvAvista - vgvAvista * i.corretorPct;
  // O orçamento das obras usa a área aproveitável em m² inteiros (68.669,00 m² no PDF)
  const areaObras = Math.floor(areaUtil);
  const custoInfra = areaObras * i.custoInfraM2;
  const infraPct = vgvAvista > 0 ? custoInfra / vgvAvista : 0;

  const prazos = Array.from(new Set<number>([...PRAZOS_MESES, nParcelas])).sort((a, b) => a - b);
  const cenarios = nParcelas > 0 ? prazos.map((m) => cenario(m, saldoLote, i.multiplicador, lotes, reajuste, inc)) : [];
  const principal = cenarios.find((c) => c.meses === nParcelas) ?? cenario(1, 0, 0, 0, 0, 0);

  const total = Math.ceil(lotes);
  const mes1 = Math.round(total * 0.45);
  const mes2 = Math.round(total * 0.35);

  // Proporção pela área (ou pela extensão da rede, quando informada): só guias e calçadas, que a planilha não calcula
  const escala = i.extensaoRede ? i.extensaoRede / BASE.rede : i.areaTotal / BASE.area;

  // Aba "Custo" da planilha (F48 a F60)
  const viasPct = i.viasPct ?? Math.max(0, 1 - i.aproveitamento) / 2; // F48
  const areaVias = viasPct * i.areaTotal; // F49 = F48 × F43
  const compVias = i.larguraVia > 0 ? areaVias / i.larguraVia : 0; // F58 = F49 ÷ F54 (rede de água e esgoto, em metros)
  const larguraRua = Math.max(0, i.larguraVia - 2 * i.larguraCalcada); // F56 = F54 − (F55 + F55)
  const nova2026 = i.planilhaInfra === "2026";
  let etapa1: StudyResult["etapa1"] = null;
  // 1ª etapa sem o valor do m² do lote dela: não calcula (não usa o m² do estudo); a proposta mostra "a definir"
  const etapa1FaltaValor = (i.primeiraEtapa || !!i.lotesEtapa1) && !i.etapaADefinir && !(i.valorM2Etapa1 && i.valorM2Etapa1 > 0);
  const etapa1ADefinir = !!i.etapaADefinir || etapa1FaltaValor;
  if ((i.primeiraEtapa || i.lotesEtapa1) && !etapa1ADefinir && areaUtil > 0) {
    let lote = i.loteEtapa1 && i.loteEtapa1 > 0 ? i.loteEtapa1 : i.metragemLote;
    // propostas sem as medidas: lotes salvos; ou a área desmembrada × aproveitamento ÷ lote
    let qtd = i.lotesEtapa1 ?? (i.areaEtapa1 && lote > 0 ? (Math.min(i.areaEtapa1, i.areaTotal) * i.aproveitamento) / lote : 0);
    let quadras: NonNullable<StudyResult["etapa1"]>["quadras"] = null;
    // Uma linha de quadras (área perimetral = comprimento da linha, em metros), com uma fileira
    // de lotes de frente para a rua: fundo = m² do lote ÷ frente. Quadras inteiras separadas por
    // ruas; se sobrar espaço no final, entra uma quadra menor. As outras medidas a descontar (m)
    // saem do perímetro só para contar os lotes; a área da etapa continua perímetro × fundo.
    const frente = i.frenteE1 && i.frenteE1 > 0 ? i.frenteE1 : i.frenteLote;
    if (i.areaPerimetralE1 && i.areaPerimetralE1 > 0 && frente > 0 && lote > 0) {
      const perimetro = i.areaPerimetralE1;
      const desconto = Math.min(perimetro, Math.max(0, i.descontoE1 ?? 0));
      const rua0 = i.ruaE1 ?? 0;
      const ruasObrig = Math.max(0, Math.floor(i.ruasObrigE1 ?? 0));
      const obrigM = Math.min(perimetro - desconto, ruasObrig * rua0);
      const linha = perimetro - desconto - obrigM;
      const rua = i.ruaE1 ?? 0;
      const fundo = lote / frente;
      const comp = Math.max(0, i.compQuadraE1 && i.compQuadraE1 > 0 ? Math.min(i.compQuadraE1, linha) : linha);
      // lotes decimais, como na planilha (sem arredondar): 250 m ÷ 8 m = 31,25 lotes
      const porQuadra = comp / frente;
      const cheias = comp > 0 ? Math.floor((linha + rua) / (comp + rua) + 1e-9) : 0;
      const sobraLinha = Math.max(0, linha - cheias * (comp + rua));
      const lotesResto = sobraLinha > 0.01 ? sobraLinha / frente : 0;
      const resto = lotesResto > 0 ? sobraLinha : 0;
      const quarteiroes = cheias + (lotesResto > 0 ? 1 : 0);
      const ruasEntre = Math.max(0, quarteiroes - 1);
      const lotesBrutos = cheias * porQuadra + lotesResto;
      const areaLotes = lotesBrutos * lote;
      // sem rua na frente: só as ruas entre as quadras, dentro da faixa
      const areaRuas = ruasEntre * rua * fundo;
      const areaTotal = perimetro * fundo;
      quadras = {
        linha, rua, fundo, frente, comp, cheias, porQuadra, resto, lotesResto, quarteiroes, lotesBrutos,
        perimetro, desconto, ruasEntre, ruasObrig, obrigM, areaLotes, areaRuas, sobra: areaTotal - areaLotes - areaRuas, areaTotal,
      };
      qtd = lotesBrutos;
    }
    const valorM2E = i.valorM2Etapa1!;
    const avista = qtd * lote * valorM2E;
    if (qtd > 0 || quadras) {
      etapa1 = {
        lotes: qtd, lote, valorM2: valorM2E, areaUtil: qtd * lote, pct: (qtd * lote) / areaUtil, avista, quadras,
        // a prazo com o mesmo financiamento do estudo: carteira ÷ VGV à vista
        prazo: vgvAvista > 0 ? avista * (principal.carteiraEmp / vgvAvista) : 0,
      };
    }
  }

  const valorAntecipado = principal.carteiraTer * (1 - i.desagio);
  const multAplicacao = Math.pow(1 + i.taxaAplicacao, nParcelas);
  const rentabilidade = valorAntecipado * multAplicacao;

  // Plano de Venda 02
  const corretagem2 = valorLote * i.corretorPct;
  const entrada2 = valorLote * i.entradaIncTerPct;
  const parcelaEntrega = valorLote * i.parcelaEntregaPct;
  const balao = valorLote * i.balaoPct;
  const remanescente = valorLote - corretagem2 - entrada2 - parcelaEntrega - balao;
  const parcelaRem = nParcelas > 0 ? (remanescente * i.multiplicador) / nParcelas : 0;
  let valorFinal = 0;
  let pr = parcelaRem;
  for (let ano = 0; ano < 15; ano++) {
    // planilha: R40:R54, 15 anos fixos
    valorFinal += pr * 12;
    pr = pr * reajuste + pr;
  }
  const totalCarteira2 = (valorFinal + entrada2 + parcelaEntrega + balao) * lotes;
  const split = (v: number) => ({ total: v, inc: v * inc, ter: v - v * inc });

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
    entradaCorretor: comissao,
    entradaInc: (entrada - comissao) * inc,
    entradaTer: (entrada - comissao) * ter,
    reajuste,
    reajusteCalculado,
    nParcelas,
    parcela,
    valorLoteContrato: parcela * nParcelas + entrada,
    saldoPrazo,
    vgvPrazoSemReajuste: saldoPrazo * lotes,
    vgvAvista,
    vgvAvistaInc: vgvAvista * inc,
    vgvAvistaTer: vgvAvista * ter,
    vgvAvistaLiq,
    vgvAvistaLiqInc: vgvAvistaLiq * inc,
    vgvAvistaLiqTer: vgvAvistaLiq * ter,
    areaObras,
    custoInfra,
    infraPct,
    jblPct: inc - infraPct,
    principal,
    cenarios,
    vendas: { mes1, mes2, mes3: total - mes1 - mes2, total },
    // planilha nova (2026): "DADOS DO PARCELAMENTO" C26 a C38 e "CUSTOS"; anterior: aba "Custo" F57 a F60
    infra: {
      rede: i.extensaoRede ?? compVias, // F58 / C33 = área de vias ÷ largura da via
      ligacoes: nova2026 ? lotes * (larguraRua + 3) : lotes * (larguraRua / 2 + 2), // CUSTOS H36 = (rua + 3) × lotes / F59
      logradouros: compVias * larguraRua, // F57 / C30
      eletrica: nova2026 ? compVias : lotes * i.frenteLote * 1.1, // CUSTOS H24 = C33 / F60 = lotes × frente + 10%
      guias: nova2026 ? compVias * 2 : BASE.guias * escala, // CUSTOS H31 = (área da rua ÷ rua) × 2
      calcadas: nova2026 ? areaVias - compVias * larguraRua : BASE.calcadas * escala, // C31 + C32 = vias − rua
      arvores: Math.floor(lotes),
      reservatorio: lotes / 100, // CUSTOS H37: 1 a cada 100 lotes
      casaQuimica: 1, // CUSTOS H42
    },
    etapa1,
    etapa1ADefinir,
    etapa1FaltaValor,
    antecipacao: {
      carteira: principal.carteiraTer,
      valor: valorAntecipado,
      jurosMes1: valorAntecipado * i.taxaAplicacao,
      multiplicador: multAplicacao,
      rentabilidade,
      ultimaBase: rentabilidade * i.taxaAplicacao,
    },
    plano02: {
      lote: rateio(valorLote, 1),
      corretagem: rateio(corretagem2, i.corretorPct),
      entrada: rateio(entrada2, i.entradaIncTerPct),
      parcelaEntrega: rateio(parcelaEntrega, i.parcelaEntregaPct),
      balao: rateio(balao, i.balaoPct),
      remanescente: rateio(remanescente, valorLote > 0 ? remanescente / valorLote : 0),
      parcelaRemanescente: split(parcelaRem),
      valorFinalLote: split(valorFinal),
      totalCarteira: split(totalCarteira2),
    },
  };
}
