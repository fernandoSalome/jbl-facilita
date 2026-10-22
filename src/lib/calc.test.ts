import { describe, expect, it } from "vitest";
import { parseInputs } from "./proposals";
import { calcular } from "./calc";

// Valores copiados da planilha PLANILHA_ORÇAM_TERRENISTA_OFICIAL.xlsx (aba "Dados do Parcelamento de Solo")
describe("planilha oficial", () => {
  const r = calcular({
    areaTotal: 30309.67,
    aproveitamento: 0.7394,
    metragemLote: 220,
    valorM2: 318.19,
    corretorPct: 0.05,
    entradaPct: 0.06,
    ipca: 0.04,
    jurosMes: 0.0067,
    reajusteManual: null,
    multiplicador: 1.68,
    anos: 20,
    incorporadorPct: 0.65,
  });
  const cen = (m: number) => r.cenarios.find((c) => c.meses === m)!;

  it("dados do parcelamento", () => {
    expect(r.areaUtil).toBeCloseTo(22410.969998, 4);
    expect(r.lotes).toBeCloseTo(101.86804544545453, 9);
    expect(r.valorLote).toBeCloseTo(70001.8, 6);
    expect(r.comissao).toBeCloseTo(3500.09, 6);
    expect(r.entrada).toBeCloseTo(4200.108, 6);
    expect(r.entradaInc).toBeCloseTo(455.0117, 6);
    expect(r.entradaTer).toBeCloseTo(245.0063, 6);
    expect(r.reajuste).toBeCloseTo(0.1204, 10);
    expect(r.parcela).toBeCloseTo(460.611844, 6);
    expect(r.valorLoteContrato).toBeCloseTo(114746.95056, 4);
  });

  it("carteira à vista", () => {
    expect(r.vgvAvista).toBeCloseTo(7130946.543663619, 4);
    expect(r.vgvAvistaInc).toBeCloseTo(4635115.253381353, 4);
    expect(r.vgvAvistaTer).toBeCloseTo(2495831.2902822667, 4);
    expect(r.vgvAvistaLiq).toBeCloseTo(6774399.216480438, 4);
  });

  it("outros períodos de parcelamento", () => {
    expect(cen(36).parcela).toBeCloseTo(3070.7456266666672, 6);
    expect(cen(36).mensalEmp).toBeCloseTo(312810.8550487108, 4);
    expect(cen(36).mensalTer).toBeCloseTo(109483.79926704877, 4);
    expect(cen(36).carteiraEmp).toBeCloseTo(12671452.826330995, 2);
    expect(cen(36).carteiraTer).toBeCloseTo(4435008.489215848, 2);
    expect(cen(60).carteiraEmp).toBeCloseTo(14319501.431434732, 2);
    expect(cen(96).carteiraEmp).toBeCloseTo(17338939.225660283, 2);
    expect(cen(120).carteiraEmp).toBeCloseTo(19800225.95611882, 2);
    expect(cen(180).carteiraEmp).toBeCloseTo(28077913.904825684, 2);
    expect(cen(216).carteiraEmp).toBeCloseTo(35020015.17539275, 2);
    expect(cen(240).carteiraEmp).toBeCloseTo(40758352.96221253, 2);
    expect(cen(240).carteiraInc).toBeCloseTo(26492929.425438143, 2);
    expect(cen(240).carteiraTer).toBeCloseTo(14265423.536774388, 2);
    expect(r.principal.meses).toBe(240);
  });
});

// Valores do PDF "Proposta São Judas Tadeu II" (jan/2026). O PDF foi calculado com
// reajuste fixo de 12%, entrada de 5% e multiplicador 1,6 (embora exiba 1,68 e 6%).
describe("proposta São Judas Tadeu II", () => {
  const r = calcular({
    areaTotal: 137338.46,
    aproveitamento: 0.5,
    metragemLote: 200,
    valorM2: 500,
    entradaPct: 0.05,
    reajusteManual: 0.12,
    multiplicador: 1.6,
    anos: 20,
    incorporadorPct: 0.65,
    custoInfraM2: 145,
  });

  it("reproduz o VGV global e a parte dos proprietários", () => {
    expect(r.principal.carteiraEmp).toBeCloseTo(188015858.21, 0);
    expect(r.principal.carteiraTer).toBeCloseTo(65805550.37, 0);
  });

  it("reproduz a parcela do cliente por prazo", () => {
    const parc = Object.fromEntries(r.cenarios.map((c) => [c.meses, c.parcela]));
    expect(parc[36]).toBeCloseTo(4222.22, 2);
    expect(parc[60]).toBeCloseTo(2533.33, 2);
    expect(parc[120]).toBeCloseTo(1266.67, 2);
    expect(parc[240]).toBeCloseTo(633.33, 2);
  });

  it("divisão 35 / 36 / 29", () => {
    expect(r.vgvAvista).toBeCloseTo(34334615, 0);
    expect(r.vgvAvistaTer).toBeCloseTo(12017115.25, 1);
    expect(r.custoInfra).toBeCloseTo(9957005, 2); // 68.669,00 m² × R$ 145,00
    expect(Math.round(r.infraPct * 100)).toBe(29);
    expect(Math.round(r.jblPct * 100)).toBe(36);
    expect(r.vendas.total).toBe(344);
    expect(r.vendas.mes1 + r.vendas.mes2 + r.vendas.mes3).toBe(344);
  });
});

// Valores do site da proposta (versão atual) e da planilha do print: proprietário 40%,
// IGPM 4,50%, juros 0,67% a.m., entrada 6%, corretor 5%, multiplicador 1,68
describe("site São Judas Tadeu II (planilha atual)", () => {
  const r = calcular({
    areaTotal: 137338.46, aproveitamento: 0.5, metragemLote: 200, incorporadorPct: 0.6, valorM2: 500, corretorPct: 0.05,
    ipca: 0.045, jurosAno: 0, jurosMes: 0.0067, entradaPct: 0.06, multiplicador: 1.68, anos: 20, lotesEtapa1: 106.38, custoInfraM2: 145,
  });
  const cen = (m: number) => r.cenarios.find((c) => c.meses === m)!;

  it("célula a célula da planilha", () => {
    expect(r.reajuste).toBeCloseTo(0.1254, 10);
    expect(r.comissao).toBeCloseTo(5000, 6);
    expect(r.entrada).toBeCloseTo(6000, 6);
    expect(r.entradaCorretor).toBeCloseTo(5000, 6);
    expect(r.entradaInc).toBeCloseTo(600, 6);
    expect(r.entradaTer).toBeCloseTo(400, 6);
    expect(r.parcela).toBeCloseTo(658, 6);
    expect(r.valorLoteContrato).toBeCloseTo(163920, 4);
  });

  it("VGV do site", () => {
    expect(r.saldoPrazo).toBeCloseTo(157920, 4);
    expect(r.vgvPrazoSemReajuste).toBeCloseTo(54221224.01, 1);
    expect(r.principal.carteiraEmp).toBeCloseTo(207984983.86, 1);
    expect(r.vgvAvista).toBeCloseTo(34334615, 2);
    expect(r.vgvAvistaTer).toBeCloseTo(13733846, 2);
    expect(r.vgvAvista * r.jblPct).toBeCloseTo(10643764, 2);
    expect(r.custoInfra).toBeCloseTo(9957005, 2);
    expect(Math.round(r.jblPct * 100)).toBe(31);
  });

  it("tabela de recebimentos do site", () => {
    expect(cen(36).parcela).toBeCloseTo(4386.67, 2);
    expect(cen(36).mensalTer).toBeCloseTo(602458.04, 1);
    expect(cen(36).mensalTerFinal).toBeCloseTo(763028.27, 1);
    expect(cen(36).carteiraTer).toBeCloseTo(24521911.19, 1);
    expect(cen(156).parcela).toBeCloseTo(1012.31, 2);
    expect(cen(156).carteiraTer).toBeCloseTo(48494357.05, 1);
    expect(cen(240).mensalTer).toBeCloseTo(90368.71, 1);
    expect(cen(240).mensalTerFinal).toBeCloseTo(852804.28, 1);
    expect(cen(240).carteiraTer).toBeCloseTo(83193993.54, 1);
  });

  it("primeira etapa e antecipação", () => {
    expect(r.etapa1!.avista).toBeCloseTo(10638000, 2);
    expect(r.etapa1!.prazo).toBeCloseTo(64440631.07, 0);

    // a mesma etapa pela opção de desmembramento: área × aproveitamento ÷ lote
    const d = calcular({ ...r.inputs, lotesEtapa1: null, primeiraEtapa: true, areaEtapa1: (106.38 * 200) / 0.5, loteEtapa1: 200 });
    expect(d.etapa1!.lotes).toBeCloseTo(106.38, 6);
    expect(d.etapa1!.avista).toBeCloseTo(10638000, 2);
    expect(d.etapa1!.prazo).toBeCloseTo(64440631.07, 0);
    // lotes digitados e m² próprio da etapa: à vista = lotes × lote × m²; % sobre a área aproveitável
    const q = calcular({ ...r.inputs, primeiraEtapa: true, lotesEtapa1: 100, loteEtapa1: 250, valorM2Etapa1: 600 });
    expect(q.etapa1!.avista).toBeCloseTo(100 * 250 * 600, 2);
    expect(q.etapa1!.pct).toBeCloseTo((100 * 250) / q.areaUtil, 8);
    expect(q.etapa1!.prazo).toBeCloseTo(q.etapa1!.avista * (q.principal.carteiraEmp / q.vgvAvista), 2);
    // pelas medidas: faixa 2.000 m² ÷ (30 + 10) = 50 m → (50 + 10) ÷ (20 + 10) = 2 quarteirões; 2 × (20 ÷ 10) = 4 lotes por quadra
    const g = calcular({ ...r.inputs, primeiraEtapa: true, areaPerimetralE1: 2000, ruaE1: 10, distRuasE1: 30, compQuadraE1: 20, frenteE1: 10 });
    expect(g.etapa1!.quadras).toMatchObject({ quarteiroes: 2, porQuadra: 4, fundo: 15 });
    expect(g.etapa1!.lotes).toBe(8);
    expect(g.etapa1!.lote).toBe(150);
    // desligada: não existe primeira etapa
    expect(calcular({ ...r.inputs, lotesEtapa1: null, primeiraEtapa: false, areaEtapa1: 40000 }).etapa1).toBe(null);
    // proposta antiga (só lotes) abre com a opção ligada e os mesmos números
    const antiga = parseInputs({ ...r.inputs });
    expect(antiga.primeiraEtapa).toBe(true);
    expect(calcular(antiga).etapa1!.prazo).toBeCloseTo(64440631.07, 0);
    expect(r.antecipacao.valor).toBeCloseTo(27731053.87, 0);
    expect(r.antecipacao.jurosMes1).toBeCloseTo(277310.54, 0);
    expect(r.antecipacao.multiplicador).toBeCloseTo(10.8926, 4);
    expect(r.antecipacao.rentabilidade).toBeCloseTo(302061992.13, -1);
    expect(r.antecipacao.ultimaBase).toBeCloseTo(3020619.92, 0);
  });

  it("quantidades de infraestrutura do PDF", () => {
    expect(r.infra.rede).toBeCloseTo(2977.96, 2);
    expect(r.infra.logradouros).toBeCloseTo(23823.64, 2);
    expect(r.infra.eletrica).toBeCloseTo(3275.75, 2);
    expect(r.infra.guias).toBeCloseTo(5955.91, 2);
    expect(r.infra.calcadas).toBeCloseTo(11911.82, 2);
    expect(r.infra.ligacoes).toBeCloseTo(2060, 2);
    expect(r.infra.arvores).toBe(343);
  });

  it("Plano de Venda 02 do print", () => {
    const p = r.plano02;
    expect(p.lote.inc).toBeCloseTo(60000, 6);
    expect(p.corretagem.total).toBeCloseTo(5000, 6);
    expect(p.corretagem.ter).toBeCloseTo(2000, 6);
    expect(p.entrada.total).toBeCloseTo(8000, 6);
    expect(p.entrada.inc).toBeCloseTo(4800, 6);
    expect(p.parcelaEntrega.inc).toBeCloseTo(16200, 6);
    expect(p.parcelaEntrega.ter).toBeCloseTo(10800, 6);
    expect(p.balao.total).toBeCloseTo(5000, 6);
    expect(p.remanescente.total).toBeCloseTo(55000, 6);
    expect(p.remanescente.pct).toBeCloseTo(0.55, 10);
    expect(p.remanescente.ter).toBeCloseTo(22000, 6);
  });
});
