import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { lerXlsx } from "./xlsx";
import { calcularAbas, montarModelo } from "./modelo";
import { lerPlanilhaCustos, recalcular } from "./planilha";

const arquivo = readFileSync(join(__dirname, "../../../base/Planilha_Infra_Quintana.xlsx"));

describe("planilha aberta na página: fórmulas", () => {
  it("sem nada trocado, as contas refeitas dão os mesmos números que o Excel guardou", () => {
    const abas = lerXlsx(arquivo);
    const calc = calcularAbas(montarModelo(abas));
    const diferentes: string[] = [];
    for (const a of calc) {
      const orig = abas.find((x) => x.nome === a.nome)!;
      for (const [ref, v] of a.celulas) {
        const o = orig.celulas.get(ref) ?? null;
        const igual = typeof o === "number" && typeof v === "number" ? Math.abs(o - v) <= 1e-6 * Math.max(1, Math.abs(o)) : o === v;
        if (!igual) diferentes.push(`${a.nome}!${ref}: Excel ${o} · página ${v}`);
      }
    }
    expect(diferentes).toEqual([]);
  });
  it("trocar o prazo, a área ou uma quantidade refaz o total", () => {
    const d = lerPlanilhaCustos(arquivo, "Planilha_Infra_Quintana.xlsx");
    const c = d.abas!.custos, dd = d.abas!.dados!;
    expect(recalcular(d, {}).total).toBeCloseTo(d.total!, 2);
    const prazo = recalcular(d, { [`${c}!C3`]: 36 });
    expect(prazo.total).not.toBeCloseTo(d.total!, 0);
    expect(prazo.info.meses).toBe(36);
    const area = recalcular(d, { [`${dd}!C5`]: 130000 });
    expect(area.info.lotes!).toBeGreaterThan(d.info.lotes!);
    expect(area.total!).toBeGreaterThan(d.total!);
    const agua = d.obras.find((g) => g.nome === "Rede de Água")!;
    const item = agua.itens.find((i) => i.quantidade !== null && i.unitario)!;
    const q = recalcular(d, { [`${c}!H${item.linha}`]: item.quantidade! + 10 });
    expect(q.total!).toBeCloseTo(d.total! + 10 * item.unitario!, 2);
  });
});

describe("os números da página fecham", () => {
  const confere = (d: ReturnType<typeof lerPlanilhaCustos>) => {
    const erros: string[] = [];
    for (const g of [...d.obras, ...d.gestao]) {
      if (g.implanta === false) continue;
      const soma = g.itens.reduce((s, i) => s + (i.total ?? 0), 0);
      if (Math.abs(soma - (g.total ?? 0)) > 0.005) erros.push(`${g.nome}: itens ${soma} · grupo ${g.total}`);
    }
    const grupos = [...d.obras, ...d.gestao].filter((g) => g.implanta !== false).reduce((s, g) => s + (g.total ?? 0), 0);
    if (Math.abs(grupos - d.total!) > 0.005) erros.push(`grupos ${grupos} · total ${d.total}`);
    return erros;
  };
  it("a soma dos itens dá o total de cada grupo e a soma dos grupos dá o custo total", () => {
    const d = lerPlanilhaCustos(arquivo, "Planilha_Infra_Quintana.xlsx");
    const c = d.abas!.custos, dd = d.abas!.dados!;
    expect(confere(d)).toEqual([]);
    expect(confere(recalcular(d, { [`${c}!C3`]: 36, [`${dd}!C22`]: 47, [`${c}!C6`]: "Nordeste", [`${c}!C42`]: 700 }))).toEqual([]);
    // por mês e por lote: o item mostra o valor × prazo / lotes
    const mk = recalcular(d, { [`${c}!C3`]: 36 }).gestao.find((g) => g.nome === "Marketing")!;
    const insta = mk.itens.find((i) => /instagram/i.test(i.nome))!;
    expect([insta.unitario, insta.quantidade, insta.unidade, insta.total]).toEqual([800, 36, "mês", 28800]);
    const proj = recalcular(d, { [`${dd}!C22`]: 47 }).gestao.find((g) => g.nome === "Projetos")!;
    const dem = proj.itens.find((i) => /demarca/i.test(i.nome))!;
    expect([dem.unitario, dem.quantidade, dem.unidade, dem.total]).toEqual([220, 47, "lote", 10340]);
  });
  it("Preparação da Área soma a abertura de logradouros (a planilha subtraía)", () => {
    const excel = calcularAbas(montarModelo(lerXlsx(arquivo)))[0].celulas.get("M4") as number;
    const d = lerPlanilhaCustos(arquivo, "Planilha_Infra_Quintana.xlsx");
    const prep = d.obras.find((g) => /prepara/i.test(g.nome))!;
    expect(prep.total).toBeCloseTo(79006.09, 2);
    expect(prep.itens.every((i) => (i.total ?? 0) >= 0)).toBe(true);
    expect(d.total!).toBeCloseTo(excel + 2 * 53820 + 112800, 2);
    expect(confere(d)).toEqual([]);
  });
  it("custos administrativos proporcionais: total digitado na Sede, mostrado por mês (÷ prazo)", () => {
    const d = recalcular(lerPlanilhaCustos(arquivo, "Planilha_Infra_Quintana.xlsx"), { "CUSTOS!C3": 18 });
    const adm = d.gestao.find((g) => g.nome === "Sede da Empresa")!.itens.find((i) => i.rateio)!;
    expect([adm.total, adm.quantidade, adm.unidade]).toEqual([112800, 18, "mês"]);
    expect(adm.unitario).toBeCloseTo(6266.67, 2);
    const menos = recalcular(d, { ...d.ajustes, "CUSTOS!C150": 90000 });
    expect(menos.total!).toBeCloseTo(d.total! - 22800, 2);
    expect(confere(menos)).toEqual([]);
  });
});

import inicial from "./primavera-inicial.json";
import { ajustesDaVersaoAntiga, type DadosCustos } from "./planilha";
import { ajustar, mudarItemObra } from "./contas";

describe("números trocados antes das fórmulas", () => {
  it("viram ajustes: o que foi digitado fica e o resto segue as fórmulas", () => {
    const base = inicial as unknown as DadosCustos;
    const { modelo: _m, ajustes: _a, ...semModelo } = base;
    // na versão antiga o item da gestão guardava só o número da célula (sem × prazo / lotes)
    semModelo.gestao = semModelo.gestao.map((g) => ({ ...g, itens: g.itens.map((i) => ({ ...i, total: i.unitario ?? i.total, unitario: null, quantidade: null })) }));
    const agua = base.obras.find((g) => g.nome === "Rede de Água")!;
    const item = agua.itens.find((i) => i.quantidade !== null && i.unitario)!;
    let antigo = mudarItemObra(semModelo as DadosCustos, agua.id, item.id, { quantidade: item.quantidade! + 10 });
    antigo = { ...antigo, info: { ...antigo.info, meses: 36 } };
    const aj = ajustesDaVersaoAntiga(antigo, base);
    expect(aj).toEqual({ [`CUSTOS!H${item.linha}`]: item.quantidade! + 10, "CUSTOS!C3": 36 });
    const novo = ajustar({ ...base, ajustes: aj }, "CUSTOS!C3", 36);
    // o prazo maior soma os custos mensais; a quantidade a mais soma 10 × o valor unitário
    const soPrazo = ajustar(base, "CUSTOS!C3", 36);
    expect(novo.total!).toBeCloseTo(soPrazo.total! + 10 * item.unitario!, 2);
    expect(soPrazo.total!).toBeGreaterThan(base.total!);
    // apagar o número volta ao da planilha
    expect(ajustar(soPrazo, "CUSTOS!C3", null).total).toBeCloseTo(base.total!, 2);
  });
});
