import { describe, expect, it } from "vitest";
import { valorDoCampo } from "@/components/study/StudyEditor";
import { calcular, DEFAULT_INPUTS, type StudyInputs } from "./calc";

describe("campos da planilha: a conta segue o que está na tela", () => {
  it("campo apagado vira zero (obrigatórios) ou vazio (opcionais), nunca o número antigo", () => {
    expect(valorDoCampo("", "pct", false)).toBe(0);
    expect(valorDoCampo("  ", "pct", false)).toBe(0);
    expect(valorDoCampo("", "pct", true)).toBeNull();
    expect(valorDoCampo("0,67", "pct", false)).toBeCloseTo(0.0067, 10);
    expect(valorDoCampo("1.250,5", "brl", false)).toBe(1250.5);
    // ainda digitando: espera o número
    expect(valorDoCampo("-", "pct", false)).toBeUndefined();
  });

  it("reajuste: apagar os juros ao ano tira os juros da conta (caso dos 20,54%)", () => {
    const antes = calcular({ ...DEFAULT_INPUTS, ipca: 0.045, jurosAno: 0.08, jurosMes: 0.0067 });
    expect(antes.reajuste).toBeCloseTo(0.2054, 6);
    const depois = calcular({ ...DEFAULT_INPUTS, ipca: 0.045, jurosAno: valorDoCampo("", "pct", false)!, jurosMes: 0.0067 });
    expect(depois.reajuste).toBeCloseTo(0.1254, 6);
  });

  it("qualquer campo zerado não deixa a proposta com NaN ou infinito", () => {
    const base: StudyInputs = { ...DEFAULT_INPUTS, areaTotal: 100000, valorArea: 1, primeiraEtapa: true, areaPerimetralE1: 500, ruaE1: 12, frenteE1: 8, compLoteE1: 25, valorM2Etapa1: 400 };
    const numeros = (Object.keys(base) as (keyof StudyInputs)[]).filter((k) => typeof base[k] === "number");
    const ruins = (v: unknown, caminho: string): string[] =>
      typeof v === "number" ? (Number.isFinite(v) ? [] : [caminho])
      : Array.isArray(v) ? v.flatMap((x, i) => ruins(x, `${caminho}[${i}]`))
      : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => ruins(x, `${caminho}.${k}`)) : [];
    for (const k of numeros) expect(ruins(calcular({ ...base, [k]: 0 }), k)).toEqual([]);
  });
});
