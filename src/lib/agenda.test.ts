import { describe, expect, it } from "vitest";
import { convite, horariosLivres, quando, slugDe, telefoneE164 } from "./agenda";

const H = { "2": [["09:00", "12:00"]] as [string, string][] }; // terça

describe("calendário", () => {
  it("horários livres de 30 em 30 minutos dentro da faixa", () => {
    const l = horariosLivres({ dia: "2026-11-03", horarios: H, duracaoMin: 30, ocupado: [], agora: new Date("2026-11-01T00:00:00-03:00") });
    expect(l.map((d) => d.toISOString())).toHaveLength(6);
    expect(l[0].getTime()).toBe(quando("2026-11-03", "09:00").getTime());
    expect(l[5].getTime()).toBe(quando("2026-11-03", "11:30").getTime());
  });
  it("tira o que está ocupado (compromisso ou Google) e o que passou da antecedência", () => {
    const ocupado = [{ inicio: quando("2026-11-03", "10:15"), fim: quando("2026-11-03", "10:45") }];
    const l = horariosLivres({ dia: "2026-11-03", horarios: H, duracaoMin: 30, ocupado, agora: quando("2026-11-03", "07:30"), antecedenciaH: 2 });
    expect(l.map((d) => d.getTime())).toEqual(["09:30", "11:00", "11:30"].map((h) => quando("2026-11-03", h).getTime()));
  });
  it("dia sem horário de trabalho não tem horários", () => {
    expect(horariosLivres({ dia: "2026-11-01", horarios: H, duracaoMin: 30, ocupado: [] })).toEqual([]);
  });
  it("celular para SMS", () => {
    expect(telefoneE164("(11) 99999-8888")).toBe("+5511999998888");
    expect(telefoneE164("+55 11 99999-8888")).toBe("+5511999998888");
    expect(telefoneE164("123")).toBeNull();
  });
  it("link e convite", () => {
    expect(slugDe("Marcelo Ávila")).toBe("marcelo-avila");
    const ics = convite({ id: "x", titulo: "Reunião, JBL", inicio: quando("2026-11-03", "09:00"), fim: quando("2026-11-03", "09:30"), organizador: { nome: "M", email: "m@x.com" } });
    expect(ics).toContain("DTSTART:20261103T120000Z");
    expect(ics).toContain("SUMMARY:Reunião\\, JBL");
  });
});
