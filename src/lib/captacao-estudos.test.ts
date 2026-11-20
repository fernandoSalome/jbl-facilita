import { describe, expect, it } from "vitest";
import { lerCustos, lerEstudo1, lerEstudo2, pendencias, respostaCentral, resumoCentral, slides } from "./captacao-estudos";

const area = { cidade: "Sorocaba", uf: "SP", dono: "Marcos", corretor: null, nome: "Terreno do Marcos", hectares: 21.44 };

describe("estudo 1", () => {
  it("lê com padrões e ignora o que não presta", () => {
    const e = lerEstudo1({ status: "xx", semaforo: "amarelo", lotes: { medio: "167" }, estrategia: ["Entrada pela avenida", 3, ""] });
    expect(e.status).toBe("aguardando");
    expect(e.semaforo).toBe("amarelo");
    expect(e.lotes.medio).toBe(167);
    expect(e.estrategia).toEqual(["Entrada pela avenida"]);
  });
  it("resumo do Central termina com a pergunta do mercadológico", () => {
    const e = lerEstudo1({ semaforo: "amarelo", zona: "ZRDS", loteMinimo: "300 m²", aproveitavelPct: 48, lotes: { pior: 27, medio: 167, bom: 283 }, alertas: [{ texto: "córregos do mapa oficial" }] });
    const r = resumoCentral(area, e);
    expect(r).toContain("Sorocaba · Marcos");
    expect(r).toContain("167 lotes no médio (27 a 283)");
    expect(r).toContain("Principal alerta: córregos do mapa oficial");
    expect(r.endsWith("1 Sim · 2 Não")).toBe(true);
  });
  it("entende a resposta do Central", () => {
    expect(respostaCentral("1")).toBe("sim");
    expect(respostaCentral("Sim, pode seguir")).toBe("sim");
    expect(respostaCentral("2 não")).toBe("nao");
    expect(respostaCentral("como está o São Judas?")).toBeNull();
  });
});

describe("apresentação", () => {
  it("sempre 9 slides, com os números do estudo", () => {
    const s = slides(area, lerEstudo1({ lotes: { medio: 167 }, zona: "ZRDS" }), lerEstudo2({ veredito: "encaixa", concorrentes: [{ nome: "Vista Verde", hoje: "R$ 690/m²", vendido: "70%" }] }));
    expect(s).toHaveLength(9);
    expect(s[4].destaque).toBe("167 lotes");
    expect(s[5].linhas[0]).toContain("Vista Verde");
  });
});

describe("custos e pendências", () => {
  it("custo sem item some; status desconhecido vira estimado", () => {
    expect(lerCustos([{ item: "Terraplenagem", valor: "1.200.000", status: "x" }, { valor: 3 }])).toEqual([{ item: "Terraplenagem", valor: 1200000, base: "", status: "estimado" }]);
  });
  it("pede o KMZ, o resumo e a reunião, e avisa área parada", () => {
    const base = { cidade: "X", dono: "Y", corretor: null, nome: "", situacao: "ativa", reuniaoId: null, updatedAt: new Date("2026-11-01"), poligono: null, estudo1: {} };
    const p = pendencias([
      { ...base, id: "a", etapa: "captacao" },
      { ...base, id: "b", etapa: "previabilidade", estudo1: { status: "pronto" }, updatedAt: new Date("2026-11-19") },
      { ...base, id: "c", etapa: "reuniao", updatedAt: new Date("2026-11-19") },
      { ...base, id: "d", etapa: "reuniao", situacao: "geladeira" },
    ], new Date("2026-11-19"));
    expect(p.map((x) => [x.areaId, x.oQue.slice(0, 12)])).toEqual([["b", "Viabilidade "], ["c", "Marcar a reu"], ["a", "Falta o KMZ"], ["a", "Parada há 18"]]);
  });
});

describe("card do funil", async () => {
  const { cartao } = await import("./captacao-estudos");
  const base = { etapa: "captacao", situacao: "ativa", poligono: null, estudo1: {}, reuniaoId: null, projectId: null };
  it("mostra a situação e o próximo passo de cada etapa", () => {
    expect(cartao(base)).toEqual({ situacao: "Aguardando KMZ", tom: "bad", passo: "pedir o KMZ" });
    expect(cartao({ ...base, poligono: [[0, 0]] }).passo).toBe("dar play no estudo?");
    expect(cartao({ ...base, etapa: "previabilidade", estudo1: { status: "perguntado" } }).passo).toBe("esperando 1 Sim · 2 Não");
    expect(cartao({ ...base, etapa: "reuniao", reuniaoId: "c1" }).tom).toBe("ok");
    expect(cartao({ ...base, situacao: "geladeira" }).situacao).toBe("Na geladeira");
  });
});

describe("checklist puxa dos passos", async () => {
  const { respostasDosPassos } = await import("./captacao-estudos");
  it("monta zona, lotes, documentos e reunião sem gravar nada", () => {
    const r = respostasDosPassos({ nome: "Terreno", dono: "Marcos", corretor: null, hectares: 21.44, estudo1: { zona: "ZRDS", loteMinimo: "300 m²", lotes: { pior: 27, medio: 167, bom: 283 } }, estudo2: {}, documentos: { "Matrícula atualizada": "ok" }, conversas: [], reuniao: { inicio: new Date("2026-11-25T17:00:00Z") }, updatedAt: new Date() });
    const v = (p: string) => r.find((x) => x.pergunta === p)?.resposta;
    expect(v("Zona")).toBe("ZRDS");
    expect(v("Matrícula")).toBe("Recebido");
    expect(r.find((x) => x.pergunta === "Matrícula")?.fonte).toBe("documento");
    expect(v("Quantidade de lotes")).toContain("27 / 167 / 283");
    expect(v("Reunião com o proprietário")).toBe("Marcada para 25/11, 14:00");
    expect(v("Viabilidade de água e esgoto")).toBeUndefined();
  });
});

describe("próximo passo", async () => {
  const { acaoDoPasso } = await import("./captacao-estudos");
  const base = { etapa: "captacao", situacao: "ativa", poligono: null, estudo1: {}, reuniaoId: null, projectId: null };
  it("diz o que fazer e leva ao lugar certo", () => {
    expect(acaoDoPasso(base)).toMatchObject({ titulo: "Pedir o KMZ da área", aba: "config" });
    expect(acaoDoPasso({ ...base, etapa: "previabilidade", estudo1: { status: "pronto" } }).botao).toBe("Mandar o resumo");
    expect(acaoDoPasso({ ...base, etapa: "reuniao" }).aba).toBe("etapa&ver=reuniao");
  });
});

describe("voltar ao original", async () => {
  const { atualizarOriginais } = await import("./captacao-estudos");
  it("guarda o original na 1ª mudança e esquece quando volta", () => {
    const o1 = atualizarOriginais({ zona: "ZRDS", risco: "" }, { zona: "ZRDS e CCS1", risco: "novo" }, {});
    expect(o1).toEqual({ zona: "ZRDS" });
    const o2 = atualizarOriginais({ zona: "ZRDS e CCS1" }, { zona: "outra" }, o1);
    expect(o2).toEqual({ zona: "ZRDS" });
    expect(atualizarOriginais({ zona: "outra" }, { zona: "ZRDS" }, o2)).toEqual({});
  });
});

describe("confirmação no Central", async () => {
  const { respostaCentral } = await import("./captacao-estudos");
  it("'segue o documento' não é sim", () => {
    expect(respostaCentral("segue o documento da matrícula")).toBeNull();
    expect(respostaCentral("1")).toBe("sim");
  });
});
