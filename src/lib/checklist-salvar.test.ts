import { describe, expect, it } from "vitest";
import type { Resposta } from "./captacao";
import { aplicarValores, respostasDoEstudo, valorAtual } from "./checklist-salvar";

const r = (pergunta: string, resposta: string, fonte: Resposta["fonte"] = "manual", secao = 8): Resposta => ({ secao, pergunta, resposta, fonte, ref: "x", em: "2026-11-01T00:00:00Z" });

describe("salvar o checklist", () => {
  it("troca a manual do item, mantém as de outra origem e ignora pergunta de fora", () => {
    const antes = [r("População", "10 mil"), r("População", "12 mil (WhatsApp)", "whatsapp"), r("Clima", "Tropical")];
    const depois = aplicarValores(antes, 8, { "População": "15 mil", "Inventada": "x", "Clima": "" }, "Fernando · 23/11/2026");
    expect(depois.filter((x) => x.pergunta === "População").map((x) => x.resposta)).toEqual(["12 mil (WhatsApp)", "15 mil"]);
    expect(depois.some((x) => x.pergunta === "Clima")).toBe(false);
    expect(depois.some((x) => x.pergunta === "Inventada")).toBe(false);
  });
  it("valor do campo é o mais recente", () => {
    expect(valorAtual([r("População", "a"), r("População", "b", "whatsapp")], 8, "População")?.resposta).toBe("b");
    expect(valorAtual([], 8, "População")).toBeNull();
  });
  it("seção inválida dá erro", () => expect(() => aplicarValores([], 99, {}, "x")).toThrow());
});

describe("checklist que vem do estudo", () => {
  it("só aceita pergunta oficial da seção (1 a 30) e com texto", () => {
    const r = respostasDoEstudo([
      { secao: 9, pergunta: "População", resposta: "9.000 (IBGE 2022)" },
      { secao: 9, pergunta: "Inventada", resposta: "x" },
      { secao: 31, pergunta: "População", resposta: "x" },
      { secao: 9, pergunta: "Clima", resposta: "  " },
    ], "Viabilidade Legal · 23/11/2026");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ secao: 8, pergunta: "População", fonte: "raiox" });
    expect(respostasDoEstudo("nada", "x")).toEqual([]);
  });
});
