import { describe, expect, it } from "vitest";
import { conversaValida, decidir, lerPedido, pedidoRapido, textoConfirmar, type AreaNaLista, type Pedido } from "./central";

const areas: AreaNaLista[] = [
  { id: "a1", titulo: "Martinópolis · Rogério", etapa: "proposta" },
  { id: "a2", titulo: "Martinópolis · Conde", etapa: "previabilidade" },
  { id: "a3", titulo: "Sorocaba · Ana", etapa: "contrato" },
];
const ids = new Set(areas.map((a) => a.id));
const agora = new Date("2026-11-25T12:00:00-03:00");
const pedido = (p: Partial<Pedido>): Pedido => ({ acao: "nada", areaId: null, candidatos: [], opcao: null, quando: null, texto: "", avisos: false, participantes: [], local: "", ...p });

describe("Central: o que a IA devolve", () => {
  it("só ações, áreas e datas válidas", () => {
    const p = lerPedido({ acao: "status", areaId: "inventada", candidatos: ["a1", "x", "a2", "a1"], quando: "ontem" }, ids, agora);
    expect(p.acao).toBe("status");
    expect(p.areaId).toBeNull();
    expect(p.candidatos).toEqual(["a1", "a2"]);
    expect(p.quando).toBeNull();
    expect(lerPedido({ acao: "apagar tudo" }, ids, agora).acao).toBe("nada");
    expect(lerPedido(null, ids, agora).acao).toBe("nada");
  });

  it("reunião: e-mail inválido sai, data no passado sai", () => {
    const p = lerPedido({ acao: "reuniao", quando: "2026-11-27T14:00:00-03:00", participantes: [{ nome: "Rogério", email: "rogerio@x.com" }, { nome: "Ana", email: "não tem" }] }, ids, agora);
    expect(p.quando?.toISOString()).toBe("2026-11-27T17:00:00.000Z");
    expect(p.participantes).toEqual([{ nome: "Rogério", email: "rogerio@x.com", telefone: "" }, { nome: "Ana", email: "", telefone: "" }]);
    expect(lerPedido({ acao: "reuniao", quando: "2026-11-20T14:00:00-03:00" }, ids, agora).quando).toBeNull();
  });

  it("respostas curtas sem IA", () => {
    expect(pedidoRapido("2")?.opcao).toBe(2);
    expect(pedidoRapido("Sim!")?.acao).toBe("sim");
    expect(pedidoRapido("não")?.acao).toBe("nao");
    expect(pedidoRapido("como está o terreno?")).toBeNull();
  });

  it("conversa vale 30 minutos; documentos, 24 horas", () => {
    const em = new Date(+agora - 40 * 60e3);
    expect(conversaValida({ passo: "o_que_fazer", areaId: "a1" }, em, agora)).toBeNull();
    expect(conversaValida({ passo: "docs_de_quem", docIds: ["d"] }, em, agora)).not.toBeNull();
  });
});

describe("Central: a conversa", () => {
  it("status de uma área: mostra e pergunta o que fazer", () => {
    const d = decidir(null, pedido({ acao: "status", areaId: "a1" }), areas);
    expect(d).toMatchObject({ tipo: "executar", acao: "status", areaId: "a1", conversa: { passo: "o_que_fazer", areaId: "a1" } });
  });

  it("dúvida entre áreas: pergunta qual e segue com a escolhida", () => {
    const d = decidir(null, pedido({ acao: "status", candidatos: ["a1", "a2"] }), areas);
    expect(d.tipo).toBe("responder");
    if (d.tipo !== "responder") return;
    expect(d.texto).toContain("1 Martinópolis · Rogério (Proposta)");
    const d2 = decidir(d.conversa, pedido({ acao: "opcao", opcao: 2 }), areas);
    expect(d2).toMatchObject({ tipo: "executar", acao: "status", areaId: "a2" });
  });

  it("não achou: pede o nome", () => {
    const d = decidir(null, pedido({ acao: "avancar" }), areas);
    expect(d).toMatchObject({ tipo: "responder", conversa: { passo: "qual_area", acao: "avancar" } });
  });

  it("menu: 1 avança, mas só depois do sim", () => {
    const d = decidir({ passo: "o_que_fazer", areaId: "a1" }, pedido({ acao: "opcao", opcao: 1 }), areas);
    expect(d).toMatchObject({ tipo: "responder", conversa: { passo: "confirmar", acao: "avancar", areaId: "a1" } });
    if (d.tipo !== "responder") return;
    expect(d.texto).toContain("de *Proposta* para *Estudo 30 dias*");
    expect(decidir(d.conversa, pedido({ acao: "sim" }), areas)).toMatchObject({ tipo: "executar", acao: "avancar", areaId: "a1" });
    expect(decidir(d.conversa, pedido({ acao: "nao" }), areas)).toMatchObject({ tipo: "responder", texto: "Ok, não faço." });
  });

  it("última etapa: não oferece avançar", () => {
    expect(textoConfirmar("avancar", areas[2])).not.toContain("1 Sim");
    expect(decidir(null, pedido({ acao: "avancar", areaId: "a3" }), areas)).toMatchObject({ tipo: "responder", conversa: null });
  });

  it("proposta e estudo pedem confirmação; usa a área do contexto", () => {
    expect(decidir(null, pedido({ acao: "proposta" }), areas, "a2")).toMatchObject({ conversa: { passo: "confirmar", acao: "proposta", areaId: "a2" } });
    expect(decidir(null, pedido({ acao: "estudo", areaId: "a2" }), areas)).toMatchObject({ conversa: { passo: "confirmar", acao: "estudo" } });
  });

  it("lembrete sai direto; sem data, pergunta", () => {
    const q = new Date("2026-11-26T09:00:00-03:00");
    expect(decidir(null, pedido({ acao: "lembrete", quando: q, texto: "ligar pro Rogério" }), areas)).toMatchObject({ tipo: "executar", acao: "lembrete", dados: { texto: "ligar pro Rogério" } });
    expect(decidir(null, pedido({ acao: "lembrete", texto: "x" }), areas)).toMatchObject({ tipo: "responder", conversa: null });
  });

  it("reunião: confirma com data e participantes", () => {
    const q = new Date("2026-11-27T14:00:00-03:00");
    const d = decidir(null, pedido({ acao: "reuniao", areaId: "a1", quando: q, participantes: [{ nome: "Rogério", email: "r@x.com", telefone: "" }] }), areas);
    expect(d.tipo).toBe("responder");
    if (d.tipo !== "responder") return;
    expect(d.texto).toContain("👤 Rogério · r@x.com");
    expect(d.texto).toContain("convite vai por e-mail");
    expect(decidir(d.conversa, pedido({ acao: "sim" }), areas)).toMatchObject({ tipo: "executar", acao: "reuniao", areaId: "a1" });
  });

  it("documentos sem dono: a resposta diz a área", () => {
    const c = { passo: "docs_de_quem" as const, docIds: ["d1", "d2"] };
    expect(decidir(c, pedido({ acao: "documentos_de", areaId: "a1" }), areas)).toMatchObject({ tipo: "executar", acao: "documentos", areaId: "a1", dados: { docIds: ["d1", "d2"] } });
    const d = decidir(c, pedido({ acao: "documentos_de", candidatos: ["a1", "a2"] }), areas);
    expect(d).toMatchObject({ tipo: "responder", conversa: { passo: "docs_de_quem", candidatos: ["a1", "a2"] } });
    if (d.tipo !== "responder") return;
    expect(decidir(d.conversa, pedido({ acao: "opcao", opcao: 2 }), areas)).toMatchObject({ acao: "documentos", areaId: "a2" });
  });

  it("'são do Rogério' sem pergunta em aberto: guarda os soltos (ou os próximos) na área", () => {
    expect(decidir(null, pedido({ acao: "documentos_de", areaId: "a1" }), areas)).toMatchObject({ tipo: "executar", acao: "documentos", areaId: "a1", dados: { docIds: [] } });
    expect(decidir(null, pedido({ acao: "documentos_de" }), areas)).toEqual({ tipo: "ignorar" });
  });

  it("conversa à toa: não é com o robô", () => {
    expect(decidir(null, pedido({ acao: "nada" }), areas)).toEqual({ tipo: "ignorar" });
  });
});
