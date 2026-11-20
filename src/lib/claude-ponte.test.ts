import { describe, expect, it } from "vitest";
import { autorizado, cortarResposta, senhaValida } from "./claude-ponte";

describe("ponte WhatsApp → Claude", () => {
  it("só o próprio WhatsApp e os números autorizados", () => {
    expect(autorizado({ deMim: true, participante: "" }, "")).toBe(true);
    expect(autorizado({ deMim: false, participante: "5511999990000" }, "11 99999-0000, 5511888887777")).toBe(true);
    expect(autorizado({ deMim: false, participante: "5521911112222" }, "5511999990000")).toBe(false);
    expect(autorizado({ deMim: false, participante: "" }, "5511999990000")).toBe(false);
  });
  it("senha da VPS", () => {
    const s = "x".repeat(32);
    expect(senhaValida(`Bearer ${s}`, s)).toBe(true);
    expect(senhaValida(`Bearer ${s}y`, s)).toBe(false);
    expect(senhaValida(null, s)).toBe(false);
    expect(senhaValida("Bearer curta", "curta")).toBe(false);
  });
  it("corta resposta longa", () => {
    expect(cortarResposta("a".repeat(5000)).length).toBeLessThanOrEqual(3500);
    expect(cortarResposta("oi")).toBe("oi");
  });
});

describe("tipo do pedido", async () => {
  const { tipoDoPedido } = await import("./claude-ponte");
  it("estudo, mercado ou pesquisa", () => {
    expect(tipoDoPedido("faça a viabilidade legal do Sítio do Pedro")).toBe("estudo");
    expect(tipoDoPedido("rode o raio-x de Sorocaba")).toBe("estudo");
    expect(tipoDoPedido("faça a viabilidade mercadológica de Sorocaba")).toBe("mercado");
    expect(tipoDoPedido("pesquise o preço de lotes em Itu")).toBe("pesquisa");
    expect(tipoDoPedido("o que é um estudo de viabilidade?")).toBe("pesquisa");
  });
});
