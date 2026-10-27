import { describe, expect, it } from "vitest";
import { limparMinuta, mesmoTelefone, minutaInicial, numeroWhatsapp, pdfAssinado } from "./minuta";

describe("minuta da carta de intenção", () => {
  it("monta com os dados enviados e marca o que falta", () => {
    const h = minutaInicial({ proprietario: { nome: "Bruna Stein", cpf: "123.456.789-00" } }, { name: "Rancho Fundo", municipio: "Pontal", uf: "MT", matricula: null }, new Date("2026-10-27T12:00:00"));
    expect(h).toContain("BRUNA STEIN");
    expect(h).toContain("123.456.789-00");
    expect(h).toContain('class="lacuna"');
    expect(h).toContain('class="assinaturas"');
  });
  it("texto editado: só formatação passa", () => {
    const sujo = '<p style="text-align:center;color:red" onclick="x()">Oi <b>forte</b> <u>sub</u><script>alert(1)</script><a href="http://x">link</a> <img src=x onerror=1></p><div align="right">dir</div>';
    const l = limparMinuta(sujo);
    expect(l).toContain('<p style="text-align:center;color:red">');
    expect(l).toContain("<strong>forte</strong>");
    expect(l).toContain("<u>sub</u>");
    expect(l).not.toMatch(/script|onclick|href|<img|<a /);
    expect(l).toContain('<div style="text-align:right">dir</div>');
  });
  it("telefone: mesmo celular com ou sem 55 e 9", () => {
    expect(mesmoTelefone("(18) 99712-3456", "5518997123456")).toBe(true);
    expect(mesmoTelefone("18 9712-3456", "(18) 99712-3456")).toBe(true);
    expect(mesmoTelefone("(11) 99712-3456", "(18) 99712-3456")).toBe(false);
    expect(numeroWhatsapp("(18) 99712-3456")).toBe("5518997123456");
    expect(numeroWhatsapp("123")).toBe(null);
  });
  it("reconhece PDF com assinatura digital", () => {
    const sem = Buffer.from("%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF");
    const com = Buffer.from("%PDF-1.7\n5 0 obj << /Type /Sig /Filter /Adobe.PPKLite /SubFilter /ETSI.CAdES.detached /Name (BRUNA STEIN:12345678900) /ByteRange [0 100 200 300] >> endobj\n%%EOF");
    expect(pdfAssinado(sem).ok).toBe(false);
    expect(pdfAssinado(com)).toEqual({ ok: true, nome: "BRUNA STEIN:12345678900" });
    expect(pdfAssinado(Buffer.from("nao e pdf")).ok).toBe(false);
  });
});
