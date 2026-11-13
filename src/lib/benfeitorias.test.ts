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
