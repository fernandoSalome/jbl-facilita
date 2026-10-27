import { describe, expect, it } from "vitest";
import { marcaJbl } from "@/components/template/Editable";

describe("nome da JBL em azul-escuro", () => {
  it("marca as formas do nome só no texto (não dentro das tags)", () => {
    expect(marcaJbl("A JBL Incorporadora e Urbanismo propõe")).toBe('A <span class="marca-jbl">JBL Incorporadora e Urbanismo</span> propõe');
    expect(marcaJbl("<b>GRUPO JBL INCORPORADORA E URBANISMO</b>, com")).toBe('<b><span class="marca-jbl">GRUPO JBL INCORPORADORA E URBANISMO</span></b>, com');
    expect(marcaJbl('<span title="JBL">o Grupo JBL</span>')).toBe('<span title="JBL">o <span class="marca-jbl">Grupo JBL</span></span>');
    expect(marcaJbl("sem nome")).toBe("sem nome");
    expect(marcaJbl("contato@jbl.com.br")).toBe("contato@jbl.com.br");
  });
});
