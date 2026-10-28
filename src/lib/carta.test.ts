import { describe, expect, it } from "vitest";
import { BLOCOS_CARTA, cartaMontada, SOCIO_JBL, valoresCarta } from "./carta";
import { minutaInicial } from "./minuta";

const projeto = { name: "Rancho Fundo", municipio: "Pontal", uf: "MT", matricula: null };

describe("carta de intenção editável", () => {
  it("sem edição usa o texto oficial com os dados", () => {
    const c = cartaMontada({}, { p_nome: "Bruna Stein", p_cpf: "123.456.789-00" }, projeto);
    expect(c.blocos).toHaveLength(BLOCOS_CARTA.length);
    expect(c.blocos[1].html).toContain("<strong>BRUNA STEIN</strong>");
    expect(c.blocos[1].html).toContain("CPF: n.º 123.456.789-00");
    expect(c.blocos[1].html).toContain('<span class="lacuna">[RG]</span>');
  });

  it("texto editado mantém os campos e escapa o que a pessoa digitou", () => {
    const c = cartaMontada({ "carta.i2": "html:Atua em todo o Brasil. Proprietário: <strong>{{p_nome}}</strong>{{inexistente}}" }, { p_nome: "Ana <b>" }, projeto);
    const i2 = c.blocos[BLOCOS_CARTA.findIndex((b) => b.k === "carta.i2")].html;
    expect(i2).toBe("Atua em todo o Brasil. Proprietário: <strong>Ana &lt;b&gt;</strong>");
  });

  it("trechos opcionais vazios não aparecem como texto", () => {
    const v = valoresCarta({}, projeto);
    expect(v.casamento).toContain("var-vazia");
    expect(v.casamento.replace(/<[^>]+>/g, "")).toBe("");
    expect(v.situado).toBe("na Gleba Rancho Fundo");
  });

  it("dados do sócio da JBL só na minuta; na proposta ficam lacunas (também em texto editado antes)", () => {
    const proposta = cartaMontada({}, {}, projeto).blocos[1].html;
    expect(proposta).not.toContain("Felipe");
    expect(proposta).not.toContain("104.945.466-97");
    expect(proposta).toContain('<span class="lacuna">[nome]</span>');
    expect(proposta).toContain("58.521.773/0001-01");
    const minuta = minutaInicial({}, projeto, new Date("2026-10-28T12:00:00"));
    expect(minuta).toContain(SOCIO_JBL);
    const editado = { "carta.partes": `html:Texto editado com ${SOCIO_JBL} no meio.` };
    expect(cartaMontada(editado, {}, projeto).blocos[1].html).not.toContain("Felipe");
    expect(cartaMontada(editado, {}, projeto, undefined, { minuta: true }).blocos[1].html).toContain(SOCIO_JBL);
  });
});
