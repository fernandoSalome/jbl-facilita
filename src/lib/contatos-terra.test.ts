import { describe, expect, it } from "vitest";
import { ehParticular, lerClassificacao, pedidoClassificacao } from "./contatos-terra";

describe("contatos de terra", () => {
  it("monta o pedido com cada conversa", () => {
    const p = pedidoClassificacao([{ telefone: "5511999990000", nome: "João", mensagens: [{ deMim: false, texto: "tenho 20 alqueires em Itu" }, { deMim: true, texto: "manda o KMZ" }] }]);
    expect(p).toContain("telefone 5511999990000");
    expect(p).toContain("Contato: tenho 20 alqueires em Itu");
    expect(p).toContain("Fernando: manda o KMZ");
  });

  it("lê a resposta e ignora o que não foi pedido", () => {
    const r = lerClassificacao(
      'Segue:\n[{"telefone":"5511999990000","terra":true,"papel":"proprietario","resumo":"20 alq em Itu","nome":"João"},{"telefone":"5500000000000","terra":true},{"telefone":"5511777770000","terra":"sim"},{"telefone":"5511666660000","terra":null},{"telefone":"5511888880000","terra":false,"papel":"x","nome":"null"}]',
      ["5511999990000", "5511888880000", "5511777770000", "5511666660000"],
    );
    expect(r).toEqual([
      { telefone: "5511999990000", terra: true, papel: "proprietario", resumo: "20 alq em Itu", nome: "João" },
      { telefone: "5511666660000", terra: null, papel: "outro", resumo: "", nome: null },
      { telefone: "5511888880000", terra: false, papel: "outro", resumo: "", nome: null },
    ]);
  });

  it("resposta quebrada não vira nada", () => {
    expect(lerClassificacao("não sei", ["1"])).toEqual([]);
    expect(lerClassificacao("[{oops]", ["1"])).toEqual([]);
  });

  it("só conversa de pessoa", () => {
    expect(ehParticular("5511999990000@s.whatsapp.net")).toBe(true);
    expect(ehParticular("120363434373802289@g.us")).toBe(false);
    expect(ehParticular("status@broadcast")).toBe(false);
  });
});
