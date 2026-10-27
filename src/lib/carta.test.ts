import { describe, expect, it } from "vitest";
import { BLOCOS_CARTA, cartaMontada, valoresCarta } from "./carta";

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
});
