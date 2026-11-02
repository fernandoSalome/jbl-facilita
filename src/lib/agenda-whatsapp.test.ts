import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ db: {} }));
const { falta, textoLembrete, textoMarcado } = await import("./agenda-whatsapp");

describe("avisos da agenda no WhatsApp", () => {
  it("escreve quanto falta", () => {
    expect(falta(24 * 3600e3)).toBe("1 dia");
    expect(falta(60 * 60e3)).toBe("1 hora");
    expect(falta(65 * 60e3)).toBe("1 hora e 5 minutos");
    expect(falta(45 * 60e3)).toBe("45 minutos");
    expect(falta(10e3)).toBe("1 minuto");
  });

  it("monta os textos com a pessoa e o horário", () => {
    const inicio = new Date("2026-11-03T17:20:00Z");
    const c = { titulo: "JBL x Maria", convidadoNome: "Maria Silva", convidadoTel: "(11) 99999-0000", convidadoEmail: null, local: null, origem: "link", inicio, fim: new Date(inicio.getTime() + 70 * 60e3), user: { name: "Marcelo Aguilar" } } as never;
    expect(textoMarcado(c)).toContain("Reunião marcada* pelo link de agendamento: JBL x Maria com Maria Silva");
    const t = textoLembrete(c, inicio.getTime() - 3600e3);
    expect(t).toContain("Falta 1 hora* para a reunião JBL x Maria com Maria Silva, às 14:20");
    expect(t).toContain("Agenda de Marcelo Aguilar");
  });
});
