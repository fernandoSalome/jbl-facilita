import { describe, expect, it } from "vitest";
import { faseDoDocumento, faseEmUso, fasePorTexto } from "./fases";
import { entenderTexto, tipoPorTexto } from "./ia";

const projetos = [
  { id: "p1", name: "São Judas Tadeu II", municipio: "Martinópolis", uf: "SP" },
  { id: "p2", name: "Fazenda Rancho Fundo", municipio: "Pontal do Araguaia", uf: "MT" },
];

describe("etapas dos documentos", () => {
  it("etapa dita na mensagem vale mais que a do tipo", () => {
    expect(faseDoDocumento("licenca", "segue a licença")).toBe("aprovacao");
    expect(faseDoDocumento("foto", "fotos da obra do São Judas")).toBe("obras");
    expect(faseDoDocumento("matricula", "")).toBe("prospeccao");
    expect(faseDoDocumento("outro", "", "vendas")).toBe("vendas");
  });
  it("documentos antigos sem etapa usam a do tipo", () => {
    expect(faseEmUso({ tipo: "contrato", fase: null })).toBe("parceria");
    expect(faseEmUso({ tipo: "contrato", fase: "vendas" })).toBe("vendas");
  });
  it("reconhece a etapa no texto", () => {
    expect(fasePorTexto("documentos da aprovação")).toBe("aprovacao");
    expect(fasePorTexto("manda os da prospecção")).toBe("prospeccao");
    expect(fasePorTexto("bom dia")).toBe(null);
  });
  it("tipos novos", () => {
    expect(tipoPorTexto("carta de intenção assinada.pdf")).toBe("proposta");
    expect(tipoPorTexto("medição de obra março")).toBe("obra");
    expect(tipoPorTexto("contrato de compra e venda lote 12")).toBe("venda");
  });
});

describe("o que a pessoa pediu no grupo (sem IA)", () => {
  it("PDF da proposta", async () => {
    expect(await entenderTexto("manda a proposta do São Judas", projetos)).toMatchObject({ acao: "pedido_proposta", projetoId: "p1" });
    expect(await entenderTexto("me envia o pdf da proposta do Rancho Fundo", projetos)).toMatchObject({ acao: "pedido_proposta", projetoId: "p2" });
  });
  it("documentos de uma etapa", async () => {
    expect(await entenderTexto("manda os documentos da aprovação do São Judas", projetos)).toMatchObject({ acao: "pedido_documento", fase: "aprovacao", projetoId: "p1" });
  });
  it("um documento", async () => {
    expect(await entenderTexto("manda a matrícula do São Judas", projetos)).toMatchObject({ acao: "pedido_documento", tipo: "matricula" });
    expect(await entenderTexto("manda a carta de intenção assinada do São Judas", projetos)).toMatchObject({ acao: "pedido_documento", tipo: "proposta" });
  });
  it("pergunta sobre a proposta continua sendo pergunta", async () => {
    expect(await entenderTexto("qual o valor do lote na proposta do São Judas?", projetos)).toMatchObject({ acao: "pergunta_proposta" });
  });
});
