import { describe, expect, it } from "vitest";
import { afetadas, chavesMudadas, lerTrocas, semChaves } from "./personalizadas";

describe("personalizadas: trocar pelo texto do template", () => {
  it("acha as chaves que o template mudou, fora as listas", () => {
    const antes = { "txt.e1t2": "velho", "txt.a": "igual", "lista.benfeitorias": { added: [] }, "txt.saiu": "x" };
    const depois = { "txt.e1t2": "novo", "txt.a": "igual", "lista.benfeitorias": { added: [1] }, "txt.entrou": "y" };
    expect(chavesMudadas(antes, depois)).toEqual(["txt.e1t2", "txt.entrou", "txt.saiu"]);
  });

  it("só as não bloqueadas, só o que mudou no tipo delas", () => {
    const ps = [
      { id: "a", formato: "x", personalizadas: ["txt.e1t2", "txt.b"] },
      { id: "b", formato: "x", bloqueada: true, personalizadas: ["txt.e1t2"] },
      { id: "c", formato: "y", personalizadas: ["txt.e1t2"] },
      { id: "d", formato: "x", personalizadas: ["txt.b"] },
    ];
    expect(afetadas(ps, { x: ["txt.e1t2"] })).toEqual([{ id: "a", chaves: ["txt.e1t2"] }]);
  });

  it("valida o pedido: só propostas escolhidas, sem listas, sem lixo", () => {
    const r = lerTrocas({ a: ["txt.e1t2", "lista.infra", 3, "txt.e1t2"], b: ["txt.x"], c: "txt.y" }, new Set(["a", "c"]));
    expect([...r]).toEqual([["a", ["txt.e1t2"]]]);
    expect(lerTrocas(null, new Set(["a"])).size).toBe(0);
    expect(lerTrocas(["a"], new Set(["a"])).size).toBe(0);
  });

  it("tira só as chaves trocadas", () => {
    expect(semChaves({ "txt.e1t2": "meu", "txt.b": "fica" }, ["txt.e1t2"])).toEqual({ "txt.b": "fica" });
  });
});
