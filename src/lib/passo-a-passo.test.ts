import { describe, expect, it } from "vitest";
import { aplicarTratamento, dataPorExtenso, lerAndamento, montarPassos, PASSOS, progressoPassos, tratamentoPadrao } from "./passo-a-passo";

describe("passo a passo do proprietário", () => {
  it("lê só passos conhecidos, datas válidas e textos com limite", () => {
    const a = lerAndamento({
      tratamento: "  Sr. Rogério  ",
      passos: {
        "estudo-preliminar": { feitoEm: "2026-11-20", nota: "ok" },
        "carta-spe": { feitoEm: "ontem", texto: "x".repeat(5000) },
        inventado: { feito: true },
        formalizacao: {},
      },
    });
    expect(a.tratamento).toBe("Sr. Rogério");
    // marca antiga só com a data conta como realizado
    expect(a.passos["estudo-preliminar"]).toEqual({ feito: true, feitoEm: "2026-11-20", nota: "ok" });
    expect(a.passos["carta-spe"].feito).toBeUndefined();
    expect(a.passos["carta-spe"].texto).toHaveLength(2500);
    expect(a.passos.inventado).toBeUndefined();
    expect(a.passos.formalizacao).toBeUndefined();
    expect(lerAndamento(null)).toEqual({ passos: {} });
    expect(lerAndamento([1, 2])).toEqual({ passos: {} });
  });

  it("realizado sem data: fica realizado e sem data", () => {
    const a = lerAndamento({ passos: { "estudo-preliminar": { feito: true } } });
    expect(a.passos["estudo-preliminar"]).toEqual({ feito: true });
    expect(montarPassos(a, null)[0]).toMatchObject({ situacao: "feito", feitoEm: undefined });
  });

  it("tratamento: primeiro nome do dono, e o feminino", () => {
    expect(tratamentoPadrao("Rogério da Silva")).toBe("Sr. Rogério");
    expect(tratamentoPadrao(null)).toBe("proprietário");
    expect(aplicarTratamento("{O} {nome} enviará; repasses {ao} {nome}", "Sr. Rogério")).toBe("O Sr. Rogério enviará; repasses ao Sr. Rogério");
    expect(aplicarTratamento("{O} {nome} enviará; repasses {ao} {nome}", "Sra. Ana")).toBe("A Sra. Ana enviará; repasses à Sra. Ana");
  });

  it("numerados em sequência, de 01 a 08", () => {
    expect(PASSOS.map((p) => p.numero)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  });

  it("o primeiro passo em aberto é o próximo; os outros vêm depois", () => {
    const p = montarPassos(lerAndamento({ passos: { "estudo-preliminar": { feito: true }, formalizacao: { feito: true } } }), "Rogério");
    expect(p.map((x) => x.situacao)).toEqual(["feito", "proximo", "feito", "depois", "depois", "depois", "depois", "depois"]);
    expect(p[1].texto).toContain("O Sr. Rogério enviará a Carta de Intenção");
    expect(p[1].textoPadrao).toBe(true);
    expect(progressoPassos(p)).toEqual({ feitos: 2, total: PASSOS.length, pct: 25 });
  });

  it("data por extenso sem mudar o dia pelo fuso", () => {
    expect(dataPorExtenso("2026-11-01")).toBe("1 de novembro de 2026");
  });
});
