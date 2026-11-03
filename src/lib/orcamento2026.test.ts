import { describe, expect, it } from "vitest";
import { calcular } from "./calc";
import { IMPLANTA_PADRAO, orcamento2026, regiaoDaUf } from "./orcamento2026";

const q = { lotes: 200, ruas: 1000, larguraRua: 8, areaRua: 8000, pvDrenagem: 10 };
const o = { regiao: "Centro-Oeste" as const, pavimento: "Cascalhamento", energia: "aerea" as const, implanta: IMPLANTA_PADRAO, mesesObra: 0 };

describe("orçamento da planilha nova (CUSTOS)", () => {
  it("preços da Planilha1: Centro-Oeste é a base; Sudeste e Norte +8%, Sul +4%, Nordeste −4%", () => {
    const co = orcamento2026(q, o);
    const pav = co.grupos.find((g) => g.nome === "Pavimentação")!;
    // cascalhamento 8 + 5 + 4 por m² de rua; guia 40 × ruas × 2
    expect(pav.total).toBeCloseTo(8000 * 17 + 2000 * 40, 6);
    expect(orcamento2026(q, { ...o, regiao: "Sudeste" }).total).toBeCloseTo(co.total * 1.08, 4);
    expect(orcamento2026(q, { ...o, regiao: "Nordeste" }).total).toBeCloseTo(co.total * 0.96, 4);
  });
  it("água: rede, ligações (rua + 3) × lotes, 20% de conexões, mão de obra e máquina", () => {
    const agua = orcamento2026(q, o).grupos.find((g) => g.nome === "Rede de água")!;
    const rede = 1000 * 20.5, lig = 11 * 200 * 5;
    // reservatório, registro e casa química em zero, como na planilha
    expect(agua.total).toBeCloseTo(rede + lig + 0.2 * (rede + lig) + (1000 + 2200) * 2 + 2.5 * 4000, 6);
  });
  it("canteiro vem desligado (Implantará? = Não); grupo desligado não soma", () => {
    const g = orcamento2026(q, o).grupos;
    expect(g.find((x) => x.nome === "Canteiro de obra")!.total).toBe(0);
    const semDrenagem = orcamento2026(q, { ...o, implanta: { ...IMPLANTA_PADRAO, drenagem: false } });
    expect(semDrenagem.total).toBeCloseTo(orcamento2026(q, o).total - g.find((x) => x.nome === "Drenagem")!.total, 6);
  });
  it("sem o tamanho da quadra: poços de visita, bocas de lobo e bigode ficam a projetar", () => {
    const g = orcamento2026({ ...q, pvDrenagem: null }, o).grupos.find((x) => x.nome === "Drenagem")!;
    expect(g.aProjetar).toBeTruthy();
    expect(g.itens.some((x) => /lobo|bigode|Poços/.test(x.nome))).toBe(false);
  });
  it("bate com a planilha nova calculada (Sul, 100.000 m², lote 250, frente 10, via 12, calçada 2, vias 25%, quadra 100)", () => {
    const r = calcular({ areaTotal: 100000, aproveitamento: 0.5, metragemLote: 250, frenteLote: 10, larguraVia: 12, larguraCalcada: 2, viasPct: 0.25, quadraMax: 100, planilhaNova: true, regiao: "Sul", pavimento: "Cascalhamento" });
    const t = (n: string) => r.orcamento!.grupos.find((g) => g.nome === n)!.total;
    expect(t("Energia")).toBeCloseTo(21666.67, 1);
    expect(t("Pavimentação")).toBeCloseTo(468000, 1);
    expect(t("Rede de água")).toBeCloseTo(97604, 1);
    expect(t("Rede de esgoto")).toBeCloseTo(288601.24, 1);
    expect(t("Drenagem")).toBeCloseTo(498515.29, 1);
    expect(t("Paisagismo")).toBeCloseTo(16640, 1);
    expect(r.custoInfra).toBeCloseTo(1391027.2, 1);
  });
  it("região pela UF", () => {
    expect(regiaoDaUf("sp")).toBe("Sudeste");
    expect(regiaoDaUf("BA")).toBe("Nordeste");
    expect(regiaoDaUf(null)).toBe("Centro-Oeste");
  });
});

describe("só as propostas marcadas usam a planilha nova", () => {
  const base = { areaTotal: 100000, aproveitamento: 0.5, metragemLote: 250, frenteLote: 10, valorM2: 400, custoInfraM2: 145 };
  it("sem a marca: área aproveitável × custo por m², como hoje", () => {
    const r = calcular(base);
    expect(r.orcamento).toBeNull();
    expect(r.custoInfra).toBe(50000 * 145);
    expect(r.custoInfraM2).toBe(145);
    expect(r.investidor).toBeNull();
  });
  it("pavimento padrão: CBUQ 3 cm (asfalto)", () => {
    const r = calcular({ ...base, planilhaNova: true });
    expect(r.orcamento!.grupos.find((g) => g.nome === "Pavimentação")!.itens[0].nome).toBe("Base e sub-base (CBUQ 3 cm)");
  });
  it("com a marca: custo pelo orçamento e o R$/m² equivalente", () => {
    const r = calcular({ ...base, planilhaNova: true, regiao: "Sudeste", investidorPct: 0.1 });
    expect(r.orcamento).not.toBeNull();
    expect(r.custoInfra).toBeCloseTo(r.orcamento!.total, 6);
    expect(r.custoInfraM2 * r.areaObras).toBeCloseTo(r.custoInfra, 4);
    expect(r.investidor!.vgvAvista).toBeCloseTo(r.vgvAvista * 0.1, 4);
    expect(r.investidor!.incLiquidoPct).toBeCloseTo(0.6 - 0.1, 10);
  });
});
