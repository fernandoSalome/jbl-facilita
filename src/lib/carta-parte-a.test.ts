import { describe, expect, it } from "vitest";
import { avisoParteA, camposDaParteA, dadosDaParteA, faltandoNaParteA } from "./carta-parte-a";

const completo = { nome: "Rogério da Silva", cpf: "123.456.789-00", rg: "12.345.678-9", nacionalidade: "brasileiro", profissao: "agricultor", nascimento: "1960-05-10", naturalidade: "Martinópolis/SP" };

describe("carta de intenção: parte A", () => {
  it("pede só os 7 campos do proprietário", () => {
    expect(faltandoNaParteA({ proprietario: completo })).toEqual([]);
    // endereço e estado civil ficam para a segunda parte
    expect(faltandoNaParteA({ proprietario: { ...completo, nome: "" } }).map((f) => f.k)).toEqual(["p_nome"]);
    expect(faltandoNaParteA({ proprietario: { ...completo, cpf: "123" } })[0].nome).toMatch(/incompleto/);
    expect(faltandoNaParteA({}).length).toBe(7);
  });

  it("guarda só os 7 campos, aparados e com limite", () => {
    const d = dadosDaParteA({ proprietario: { ...completo, nome: "  Rogério  ", endereco: "Rua X", rg: 5, profissao: "x".repeat(500) } });
    expect(Object.keys(d.proprietario)).toHaveLength(7);
    expect(d.proprietario.nome).toBe("Rogério");
    expect(d.proprietario.rg).toBe("");
    expect(d.proprietario.profissao).toHaveLength(160);
    expect(d.proprietario).not.toHaveProperty("endereco");
    expect(dadosDaParteA(null).proprietario.nome).toBe("");
  });

  it("volta para os campos do formulário", () => {
    expect(camposDaParteA({ proprietario: { nome: "Rogério", cpf: "", outro: "x" } })).toEqual({ p_nome: "Rogério" });
    expect(camposDaParteA(null)).toEqual({});
  });

  it("aviso no grupo", () => {
    expect(avisoParteA("Sr. Rogério", "Martinópolis", "SP", "Proposta 1")).toContain("*Sr. Rogério* assinou a parte A da carta de intenção de *Martinópolis/SP*");
  });
});
