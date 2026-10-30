import { describe, expect, it } from "vitest";
import { MSG_PADRAO, montarMensagem, saudacao } from "./mensagem";

const v = { saudacao: "Boa tarde", nome: "Família Silva", tipo: "Loteamento Aberto Urbano", gleba: "São Judas", link: "https://x/p/abc" };

describe("mensagem do WhatsApp", () => {
  it("sem texto no template usa o padrão, com os campos preenchidos", () => {
    const m = montarMensagem(undefined, v);
    expect(m.startsWith("Boa tarde a todos!\n\nFamília Silva, segue")).toBe(true);
    expect(m).toContain("*Loteamento Aberto Urbano na Gleba São Judas*");
    expect(m.endsWith("https://x/p/abc")).toBe(true);
    expect(m).not.toContain("[");
    expect(montarMensagem("  ", v)).toBe(montarMensagem(MSG_PADRAO, v));
  });
  it("texto do template, com campos em qualquer caixa; colchete desconhecido fica como está", () => {
    expect(montarMensagem("[saudação], [NOME]! [Gleba] [outro] [link]", v)).toBe("Boa tarde, Família Silva! São Judas [outro] https://x/p/abc");
  });
  it("saudação pela hora de São Paulo", () => {
    expect(saudacao(new Date("2026-10-26T05:59:00-03:00"))).toBe("Bom dia"); // 05h59
    expect(saudacao(new Date("2026-10-26T02:59:00-03:00"))).toBe("Bom dia");
    expect(saudacao(new Date("2026-10-26T03:00:00-03:00"))).toBe("Bom dia");
    expect(saudacao(new Date("2026-10-26T12:00:00-03:00"))).toBe("Boa tarde");
    expect(saudacao(new Date("2026-10-26T18:00:00-03:00"))).toBe("Boa noite");
  });
});
