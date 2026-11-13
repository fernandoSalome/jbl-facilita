import { describe, expect, it } from "vitest";
import { FORMATOS, FORMATOS_INICIAIS } from "./formatos";
import { chaveBf, listaCompleta, uniaoBenfeitorias } from "./benfeitorias";

describe("benfeitorias: lista única em todos os tipos", () => {
  const u = uniaoBenfeitorias(FORMATOS.map((f) => ({ itens: FORMATOS_INICIAIS[f].benfeitorias, ov: FORMATOS_INICIAIS[f].overrides })));

  it("junta variações do mesmo item", () => {
    expect(chaveBf("📹 Sistema de segurança (CFTV)")).toBe(chaveBf("Sistema de segurança"));
    expect(chaveBf("🌳 Praça equipada e arborizada")).toBe(chaveBf("Praças de convivência equipadas e arborizadas"));
    expect(chaveBf("Piscina")).not.toBe(chaveBf("Pista de caminhada"));
  });

  it("todos os tipos ficam com todas, sem repetir, e mantêm os ids que já tinham", () => {
    for (const f of FORMATOS) {
      const l = listaCompleta(u, FORMATOS_INICIAIS[f].benfeitorias, {});
      expect(l).toHaveLength(u.length);
      expect(new Set(l.map((b) => b.id)).size).toBe(l.length);
      for (const b of FORMATOS_INICIAIS[f].benfeitorias) expect(l).toContainEqual(b);
    }
  });
});

describe("benfeitorias: ordem arrastada", () => {
  it("aplica a ordem e deixa no fim os itens fora dela", async () => {
    const { aplicarDiff } = await import("./formatos");
    const base = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(aplicarDiff(base, { order: ["c", "a", "b"] }).map((i) => i.id)).toEqual(["c", "a", "b"]);
    expect(aplicarDiff(base, { order: ["b", "a"], added: [{ id: "d" }] }).map((i) => i.id)).toEqual(["b", "a", "c", "d"]);
    expect(aplicarDiff(base, {}).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});
