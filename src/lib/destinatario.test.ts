import { describe, expect, it } from "vitest";
import { comCampos, tratamento } from "./destinatario";

describe("tratamento da proposta", () => {
  it("família com sobrenome", () => {
    const d = tratamento({ tipo: "familia", nome: "Silva" });
    expect(d.saudacao).toBe("Prezada Família Silva,");
    expect(d.pick("f", "p")).toBe("f");
    expect(comCampos(d.saudacao, d)).toEqual({ texto: "Prezada {{familia}},", vars: { familia: "Família Silva" } });
    expect(tratamento({ tipo: "familia", nome: "Família Souza" }).rotulo).toBe("Família Souza");
  });
  it("família sem nome não mexe nos textos (edições antigas continuam valendo)", () => {
    const d = tratamento({ tipo: "familia" });
    expect(d.saudacao).toBe("Prezada Família,");
    expect(comCampos("Quanto a família recebe", d)).toEqual({ texto: "Quanto a família recebe", vars: undefined });
  });
  it("pessoa com Sr./Sra. e nome, em terceira pessoa", () => {
    const d = tratamento({ tipo: "pessoa", nome: "João", genero: "m" });
    expect(d.saudacao).toBe("Prezado Sr. João,");
    expect(d.pick("f", "p")).toBe("p");
    const c = comCampos(`Quanto ${d.quem} recebe. Parte ${d.da}. ${d.Quem} escolhe.`, d);
    expect(c.texto).toBe("Quanto {{quem}} recebe. Parte {{da}}. {{Quem}} escolhe.");
    const f = tratamento({ tipo: "pessoa", nome: "Maria", genero: "f" });
    expect(f.saudacao).toBe("Prezada Sra. Maria,");
    expect(`Carta ${f.ao} ${f.rotulo}`).toBe("Carta à Sra. Maria");
  });
  it("Sr./Sra. escrito no nome não se repete", () => {
    expect(tratamento({ tipo: "pessoa", nome: "Sra. Bruna Stein", genero: "f" }).saudacao).toBe("Prezada Sra. Bruna Stein,");
    expect(tratamento({ tipo: "pessoa", nome: "Sra Bruna Stein" }).saudacao).toBe("Prezada Sra. Bruna Stein,");
    expect(tratamento({ tipo: "pessoa", nome: "sr. João" }).saudacao).toBe("Prezado Sr. João,");
  });
  it("propostas antigas com 'proprietário' viram pessoa sem nome", () => {
    const d = tratamento({ tipo: "proprietario", genero: "f" });
    expect(d.tipo).toBe("pessoa");
    expect(d.saudacao).toBe("Prezada Proprietária,");
    expect(d.quem).toBe("a proprietária");
  });
});
