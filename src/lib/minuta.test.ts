import { describe, expect, it } from "vitest";
import { CLAUSULA_ELETRONICA, comClausulaEletronica, cpfValido, limparMinuta, minutaInicial, numeroWhatsapp } from "./minuta";

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
  it("telefone com DDI do Brasil", () => {
    expect(numeroWhatsapp("(18) 99712-3456")).toBe("5518997123456");
    expect(numeroWhatsapp("5518997123456")).toBe("5518997123456");
    expect(numeroWhatsapp("123")).toBe(null);
    expect(numeroWhatsapp("119040091744")).toBe(null); // um dígito a mais
    expect(numeroWhatsapp("(11) 3333-4444")).toBe("551133334444");
    expect(numeroWhatsapp("(55) 99123-4567")).toBe("5555991234567"); // DDD 55
  });
  it("CPF válido", () => {
    expect(cpfValido("123.456.789-09")).toBe(true);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123.456.789-00")).toBe(false);
  });
  it("cláusula da assinatura eletrônica antes das assinaturas, uma vez só", () => {
    const h = minutaInicial({ proprietario: { nome: "Bruna Stein" } }, { name: "Rancho Fundo", municipio: "Pontal", uf: "MT", matricula: null }, new Date("2026-10-27T12:00:00"));
    expect(h.indexOf(CLAUSULA_ELETRONICA)).toBeGreaterThan(0);
    expect(h.indexOf(CLAUSULA_ELETRONICA)).toBeLessThan(h.indexOf('class="assinaturas"'));
    expect(comClausulaEletronica(h)).toBe(h);
    expect(comClausulaEletronica("<p>texto editado</p>")).toContain(CLAUSULA_ELETRONICA);
  });
});
