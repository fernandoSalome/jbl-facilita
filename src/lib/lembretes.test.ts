import { describe, expect, it } from "vitest";
import { lerPedidoLembrete, resumoArea, resumoManha } from "./lembretes";

// 20/11/2026, 10:00 em São Paulo (quinta-feira)
const agora = new Date("2026-11-20T10:00:00-03:00");
const sp = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

describe("pedido de lembrete", () => {
  it("amanhã às 9h", () => {
    const r = lerPedidoLembrete("me lembra amanhã às 9h de ligar pro Pedro", agora)!;
    expect(sp(r.quando)).toBe("21/11, 09:00");
    expect(r.texto).toBe("Ligar pro Pedro");
  });
  it("data e hora com minutos", () => {
    const r = lerPedidoLembrete("lembrete 25/11 14:30 reunião na prefeitura de Sorocaba", agora)!;
    expect(sp(r.quando)).toBe("25/11, 14:30");
    expect(r.texto).toBe("Reunião na prefeitura de Sorocaba");
  });
  it("daqui a 2 horas", () => {
    const r = lerPedidoLembrete("me avisa daqui a 2 horas de mandar a proposta", agora)!;
    expect(sp(r.quando)).toBe("20/11, 12:00");
    expect(r.texto).toBe("Mandar a proposta");
  });
  it("só a hora: hoje se ainda não passou, senão amanhã", () => {
    expect(sp(lerPedidoLembrete("me lembra às 16h de cobrar a matrícula", agora)!.quando)).toBe("20/11, 16:00");
    expect(sp(lerPedidoLembrete("me lembra às 8h de cobrar a matrícula", agora)!.quando)).toBe("21/11, 08:00");
  });
  it("dia da semana sem hora: 8h", () => {
    expect(sp(lerPedidoLembrete("me lembra segunda de ver o SAAE", agora)!.quando)).toBe("23/11, 08:00");
  });
  it("não é pedido de lembrete", () => {
    expect(lerPedidoLembrete("qual a situação de Sorocaba?", agora)).toBeNull();
    expect(lerPedidoLembrete("me lembra disso", agora)).toBeNull();
  });
});

describe("resumos", () => {
  it("manhã com reuniões, pendências e lembretes", () => {
    const t = resumoManha({ agora, reunioes: [{ titulo: "Reunião · Sorocaba", inicio: new Date("2026-11-20T14:00:00-03:00"), local: null }], pendencias: [{ areaId: "a", titulo: "Sorocaba · Marcos", oQue: "Marcar a reunião", aba: "etapa", peso: 3 }], lembretes: [] });
    expect(t).toContain("14:00 · Reunião · Sorocaba");
    expect(t).toContain("Sorocaba · Marcos: Marcar a reunião");
  });
  it("área em texto", () => {
    const t = resumoArea({ cidade: "Sorocaba", uf: "SP", dono: "Marcos", corretor: null, nome: "", hectares: 21.44, etapa: "previabilidade", situacao: "ativa", poligono: [[0, 0]], reuniaoId: null, projectId: null, checklist: [], documentos: { "KMZ da área": "ok" }, estudo1: { status: "pronto", semaforo: "amarelo", zona: "ZRDS", lotes: { pior: 27, medio: 167, bom: 283 } } });
    expect(t).toContain("*Sorocaba · Marcos* · 21,4 ha");
    expect(t).toContain("Próximo passo: mandar resumo ao Central");
    expect(t).toContain("27 / *167* / 283");
  });
});
