import { describe, expect, it } from "vitest";
import { documentoDoEstudo } from "./estudo-fontes";

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");

describe("documento baixado pelo estudo", () => {
  it("aceita PDF de verdade e monta o título", () => {
    const d = documentoDoEstudo("lei_plano-diretor.pdf", b64("%PDF-1.7 ..."));
    expect("erro" in d).toBe(false);
    if (!("erro" in d)) {
      expect(d.mime).toBe("application/pdf");
      expect(d.titulo).toBe("Fonte do estudo: lei plano diretor");
    }
  });

  it("recusa extensão que não confere com o conteúdo e tipo fora da lista", () => {
    expect(documentoDoEstudo("mapa.png", b64("%PDF-1.7"))).toEqual({ erro: "O conteúdo não confere com o tipo do arquivo" });
    expect(documentoDoEstudo("x.html", b64("<html>"))).toEqual({ erro: "Só PDF, PNG ou JPG" });
  });

  it("recusa arquivo grande e tira caracteres estranhos do nome", () => {
    expect(documentoDoEstudo("a.pdf", b64(Buffer.alloc(3 * 1024 * 1024 + 10, 37)))).toEqual({ erro: "Arquivo grande demais" });
    const d = documentoDoEstudo("../../etc/zoneamento.jpg", b64(Buffer.from([0xff, 0xd8, 0xff, 0xe0])));
    expect(!("erro" in d) && d.fileName).toBe(".. .. etczoneamento.jpg".replace(/ /g, ""));
  });
});
