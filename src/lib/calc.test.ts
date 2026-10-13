import { describe, expect, it } from "vitest";
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
    expect(r.custoInfra).toBeCloseTo(9957038.35, 1);
    expect(Math.round(r.infraPct * 100)).toBe(29);
    expect(Math.round(r.jblPct * 100)).toBe(36);
    expect(r.vendas.total).toBe(344);
    expect(r.vendas.mes1 + r.vendas.mes2 + r.vendas.mes3).toBe(344);
  });
});
