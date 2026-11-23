import { describe, expect, it } from "vitest";
import { lerAndamento, percentual, textoComecou, textoPronto } from "./estudo-andamento";

describe("andamento do estudo", () => {
  it("lê a linha que a VPS grava", () => {
    expect(lerAndamento("60 Calculando os lotes")).toEqual({ progresso: 60, fase: "Calculando os lotes" });
    expect(lerAndamento("20% - Lendo as leis\nmais")).toEqual({ progresso: 20, fase: "Lendo as leis" });
    expect(lerAndamento("150 fim")?.progresso).toBe(99);
    expect(lerAndamento("sem número")).toBeNull();
    expect(lerAndamento(3)).toBeNull();
  });
  it("na fila é 0; rodando usa o que a VPS disse ou estima pelo tempo", () => {
    const ini = new Date(Date.UTC(2026, 10, 22, 12, 0));
    const em = (min: number) => new Date(+ini + min * 60_000);
    expect(percentual({ status: "fila", progresso: null, iniciadoEm: null }, "estudo")).toBe(0);
    expect(percentual({ status: "rodando", progresso: 40, iniciadoEm: ini }, "estudo", em(1))).toBe(40);
    expect(percentual({ status: "rodando", progresso: null, iniciadoEm: ini }, "estudo", em(15))).toBe(30);
    expect(percentual({ status: "rodando", progresso: null, iniciadoEm: ini }, "estudo", em(500))).toBe(90);
  });
  it("textos dos avisos", () => {
    expect(textoComecou("Atibaia · Gleba", "estudo")).toContain("Comecei a análise da gleba *Atibaia · Gleba*");
    expect(textoPronto("X", "mercado", true)).toContain("Viabilidade Mercadológica de *X* pronta");
    expect(textoPronto("X", "estudo", false)).toContain("não terminou");
  });
});
