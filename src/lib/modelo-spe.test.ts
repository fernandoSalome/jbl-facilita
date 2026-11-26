import { describe, expect, it } from "vitest";
import { disposicao, erroDoModelo, LIMITE_MODELO, nomeDoModelo } from "./modelo-spe";

const pdf = new TextEncoder().encode("%PDF-1.7 conteúdo");

describe("modelo da SPE", () => {
  it("aceita só PDF de verdade, até 4 MB", () => {
    expect(erroDoModelo(pdf, "Minuta.pdf")).toBeNull();
    expect(erroDoModelo(pdf, "Minuta.docx")).toMatch(/PDF/);
    expect(erroDoModelo(new TextEncoder().encode("<html>"), "x.pdf")).toMatch(/PDF/);
    expect(erroDoModelo(new Uint8Array(0), "x.pdf")).toMatch(/vazio/);
    expect(erroDoModelo(new Uint8Array(LIMITE_MODELO + 1), "x.pdf")).toMatch(/4 MB/);
  });

  it("nome do arquivo limpo", () => {
    expect(nomeDoModelo("C:\\x\\JBL_Minuta SPE_Atualizada_Ofc.pdf")).toBe("JBL_Minuta SPE_Atualizada_Ofc.pdf");
    expect(nomeDoModelo("../a<b>.pdf")).toBe("ab.pdf");
    expect(nomeDoModelo("sem-extensao")).toBe("Minuta SPE - JBL.pdf");
  });

  it("cabeçalho de download com acento", () => {
    expect(disposicao("attachment", "Minuta Sociedade Propósito.pdf")).toBe(
      `attachment; filename="Minuta Sociedade Proposito.pdf"; filename*=UTF-8''Minuta%20Sociedade%20Prop%C3%B3sito.pdf`,
    );
  });
});
