import { describe, expect, it } from "vitest";
import { MSG_PADRAO, atualizarSaudacao, montarMensagem, saudacao } from "./mensagem";

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
    const s = (h: string) => saudacao(new Date(`2026-10-26T${h}:00-03:00`));
    expect(s("05:59")).toBe("Boa noite");
    expect(s("06:00")).toBe("Bom dia");
    expect(s("11:59")).toBe("Bom dia");
    expect(s("12:00")).toBe("Boa tarde");
    expect(s("18:00")).toBe("Boa tarde");
    expect(s("18:01")).toBe("Boa noite");
    expect(s("23:59")).toBe("Boa noite");
    expect(s("00:00")).toBe("Boa noite");
    expect(saudacao(new Date("2026-10-26T13:00:00Z"))).toBe("Bom dia"); // 10h em São Paulo
  });
  it("mensagem editada à mão ganha a saudação da hora", () => {
    const tarde = new Date("2026-10-26T15:00:00-03:00");
    expect(atualizarSaudacao("Bom dia a todos! Bom dia", tarde)).toBe("Boa tarde a todos! Bom dia");
    expect(atualizarSaudacao("Olá, boa noite!", tarde)).toBe("Olá, boa tarde!");
    expect(atualizarSaudacao("Olá a todos!", tarde)).toBe("Olá a todos!");
  });
});
