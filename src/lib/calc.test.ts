import { describe, expect, it } from "vitest";
import { parseInputs } from "./proposals";
import { calcular } from "./calc";

// Valores copiados da planilha PLANILHA_ORÇAM_TERRENISTA_OFICIAL.xlsx (aba "Dados do Parcelamento de Solo")
describe("planilha oficial", () => {
  const r = calcular({
    planilhaInfra: null,
    areaTotal: 30309.67,
    aproveitamento: 0.7394,
    metragemLote: 220,
    valorM2: 318.19,
    corretorPct: 0.05,
    entradaPct: 0.06,
    ipca: 0.04,
    jurosMes: 0.0067,
    reajusteManual: null,
    multiplicador: 1.68,
    anos: 20,
    incorporadorPct: 0.65,
  });
  const cen = (m: number) => r.cenarios.find((c) => c.meses === m)!;

  it("dados do parcelamento", () => {
    expect(r.areaUtil).toBeCloseTo(22410.969998, 4);
    expect(r.lotes).toBeCloseTo(101.86804544545453, 9);
    expect(r.valorLote).toBeCloseTo(70001.8, 6);
    expect(r.comissao).toBeCloseTo(3500.09, 6);
    expect(r.entrada).toBeCloseTo(4200.108, 6);
    expect(r.entradaInc).toBeCloseTo(455.0117, 6);
    expect(r.entradaTer).toBeCloseTo(245.0063, 6);
    expect(r.reajuste).toBeCloseTo(0.1204, 10);
    expect(r.parcela).toBeCloseTo(460.611844, 6);
    expect(r.valorLoteContrato).toBeCloseTo(114746.95056, 4);
  });

  it("carteira à vista", () => {
    expect(r.vgvAvista).toBeCloseTo(7130946.543663619, 4);
    expect(r.vgvAvistaInc).toBeCloseTo(4635115.253381353, 4);
    expect(r.vgvAvistaTer).toBeCloseTo(2495831.2902822667, 4);
    expect(r.vgvAvistaLiq).toBeCloseTo(6774399.216480438, 4);
  });

  it("outros períodos de parcelamento", () => {
    expect(cen(36).parcela).toBeCloseTo(3070.7456266666672, 6);
    expect(cen(36).mensalEmp).toBeCloseTo(312810.8550487108, 4);
    expect(cen(36).mensalTer).toBeCloseTo(109483.79926704877, 4);
    expect(cen(36).carteiraEmp).toBeCloseTo(12671452.826330995, 2);
    expect(cen(36).carteiraTer).toBeCloseTo(4435008.489215848, 2);
    expect(cen(60).carteiraEmp).toBeCloseTo(14319501.431434732, 2);
    expect(cen(96).carteiraEmp).toBeCloseTo(17338939.225660283, 2);
    expect(cen(120).carteiraEmp).toBeCloseTo(19800225.95611882, 2);
    expect(cen(180).carteiraEmp).toBeCloseTo(28077913.904825684, 2);
    expect(cen(216).carteiraEmp).toBeCloseTo(35020015.17539275, 2);
    expect(cen(240).carteiraEmp).toBeCloseTo(40758352.96221253, 2);
    expect(cen(240).carteiraInc).toBeCloseTo(26492929.425438143, 2);
    expect(cen(240).carteiraTer).toBeCloseTo(14265423.536774388, 2);
    expect(r.principal.meses).toBe(240);
  });
});

// Valores do PDF "Proposta São Judas Tadeu II" (jan/2026). O PDF foi calculado com
// reajuste fixo de 12%, entrada de 5% e multiplicador 1,6 (embora exiba 1,68 e 6%).
describe("proposta São Judas Tadeu II", () => {
  const r = calcular({
    planilhaInfra: null,
    areaTotal: 137338.46,
    aproveitamento: 0.5,
    metragemLote: 200,
    valorM2: 500,
    entradaPct: 0.05,
    reajusteManual: 0.12,
    multiplicador: 1.6,
    anos: 20,
    incorporadorPct: 0.65,
    custoInfraM2: 145,
  });

  it("reproduz o VGV global e a parte dos proprietários", () => {
    expect(r.principal.carteiraEmp).toBeCloseTo(188015858.21, 0);
    expect(r.principal.carteiraTer).toBeCloseTo(65805550.37, 0);
  });

  it("reproduz a parcela do cliente por prazo", () => {
    const parc = Object.fromEntries(r.cenarios.map((c) => [c.meses, c.parcela]));
    expect(parc[36]).toBeCloseTo(4222.22, 2);
    expect(parc[60]).toBeCloseTo(2533.33, 2);
    expect(parc[120]).toBeCloseTo(1266.67, 2);
    expect(parc[240]).toBeCloseTo(633.33, 2);
  });

  it("divisão 35 / 36 / 29", () => {
    expect(r.vgvAvista).toBeCloseTo(34334615, 0);
    expect(r.vgvAvistaTer).toBeCloseTo(12017115.25, 1);
    expect(r.custoInfra).toBeCloseTo(9957005, 2); // 68.669,00 m² × R$ 145,00
    expect(Math.round(r.infraPct * 100)).toBe(29);
    expect(Math.round(r.jblPct * 100)).toBe(36);
    expect(r.vendas.total).toBe(344);
    expect(r.vendas.mes1 + r.vendas.mes2 + r.vendas.mes3).toBe(344);
  });
});

// Valores do site da proposta (versão atual) e da planilha do print: proprietário 40%,
// IGPM 4,50%, juros 0,67% a.m., entrada 6%, corretor 5%, multiplicador 1,68
describe("site São Judas Tadeu II (planilha atual)", () => {
  const r = calcular({
    planilhaInfra: null,
    areaTotal: 137338.46, aproveitamento: 0.5, metragemLote: 200, incorporadorPct: 0.6, valorM2: 500, corretorPct: 0.05,
    ipca: 0.045, jurosAno: 0, jurosMes: 0.0067, entradaPct: 0.06, multiplicador: 1.68, anos: 20, lotesEtapa1: 106.38, valorM2Etapa1: 500, custoInfraM2: 145,
  });
  const cen = (m: number) => r.cenarios.find((c) => c.meses === m)!;

  it("célula a célula da planilha", () => {
    expect(r.reajuste).toBeCloseTo(0.1254, 10);
    expect(r.comissao).toBeCloseTo(5000, 6);
    expect(r.entrada).toBeCloseTo(6000, 6);
    expect(r.entradaCorretor).toBeCloseTo(5000, 6);
    expect(r.entradaInc).toBeCloseTo(600, 6);
    expect(r.entradaTer).toBeCloseTo(400, 6);
    expect(r.parcela).toBeCloseTo(658, 6);
    expect(r.valorLoteContrato).toBeCloseTo(163920, 4);
  });

  it("VGV do site", () => {
    expect(r.saldoPrazo).toBeCloseTo(157920, 4);
    expect(r.vgvPrazoSemReajuste).toBeCloseTo(54221224.01, 1);
    expect(r.principal.carteiraEmp).toBeCloseTo(207984983.86, 1);
    expect(r.vgvAvista).toBeCloseTo(34334615, 2);
    expect(r.vgvAvistaTer).toBeCloseTo(13733846, 2);
    expect(r.vgvAvista * r.jblPct).toBeCloseTo(10643764, 2);
    expect(r.custoInfra).toBeCloseTo(9957005, 2);
    expect(Math.round(r.jblPct * 100)).toBe(31);
  });

  it("tabela de recebimentos do site", () => {
    expect(cen(36).parcela).toBeCloseTo(4386.67, 2);
    expect(cen(36).mensalTer).toBeCloseTo(602458.04, 1);
    expect(cen(36).mensalTerFinal).toBeCloseTo(763028.27, 1);
    expect(cen(36).carteiraTer).toBeCloseTo(24521911.19, 1);
    expect(cen(156).parcela).toBeCloseTo(1012.31, 2);
    expect(cen(156).carteiraTer).toBeCloseTo(48494357.05, 1);
    expect(cen(240).mensalTer).toBeCloseTo(90368.71, 1);
    expect(cen(240).mensalTerFinal).toBeCloseTo(852804.28, 1);
    expect(cen(240).carteiraTer).toBeCloseTo(83193993.54, 1);
  });

  it("primeira etapa com financiamento próprio (vazio = o do estudo)", () => {
    const base = { ...r.inputs, planilhaInfra: "2026" as const, primeiraEtapa: true, lotesEtapa1: 100, loteEtapa1: 250, valorM2Etapa1: 600 };
    const igual = calcular(base);
    // tudo vazio: as contas do estudo, na proporção do VGV à vista (como era antes)
    expect(igual.etapa1!.fin.reajuste).toBe(igual.reajuste);
    expect(igual.etapa1!.fin.nParcelas).toBe(igual.nParcelas);
    expect(igual.etapa1!.prazo).toBeCloseTo(igual.etapa1!.avista * (igual.principal.carteiraEmp / igual.vgvAvista), 2);

    const e = calcular({ ...base, ipcaE1: 0.04, jurosAnoE1: 0, jurosMesE1: 0.0066, entradaPctE1: 0.1, multiplicadorE1: 1.5, anosE1: 10, indiceE1: "INCC" });
    const f = e.etapa1!.fin;
    expect(f.indice).toBe("INCC");
    expect(f.reajuste).toBeCloseTo(0.04 + 0.0066 * 12, 12); // 11,92%
    expect(f.valorLote).toBeCloseTo(250 * 600, 6);
    expect(f.entrada).toBeCloseTo(15000, 6);
    expect(f.nParcelas).toBe(120);
    expect(f.parcela).toBeCloseTo(((150000 - 15000) * 1.5) / 120, 6);
    // carteira: 10 anos de parcelas com o reajuste da etapa + a entrada de todos os lotes (planilha 2026)
    let p = f.parcela, soma = 0;
    for (let ano = 0; ano < 10; ano++) { soma += p * 100 * 12; p += p * f.reajuste; }
    expect(e.etapa1!.prazo).toBeCloseTo(soma + 15000 * 100, 2);
    expect(f.cenario.carteiraTer).toBeCloseTo(e.etapa1!.prazo * e.terrenistaPct, 2);
    // o estudo não muda
    expect(e.principal.carteiraEmp).toBe(igual.principal.carteiraEmp);
    expect(e.reajuste).toBe(igual.reajuste);
    // só uma taxa preenchida: as outras vêm do estudo
    expect(calcular({ ...base, jurosMesE1: 0 }).etapa1!.fin.reajuste).toBeCloseTo(r.inputs.ipca + r.inputs.jurosAno, 12);
  });

  it("primeira etapa e antecipação", () => {
    expect(r.etapa1!.avista).toBeCloseTo(10638000, 2);
    expect(r.etapa1!.prazo).toBeCloseTo(64440631.07, 0);

    // a mesma etapa pela opção de desmembramento: área × aproveitamento ÷ lote
    const d = calcular({ ...r.inputs, lotesEtapa1: null, primeiraEtapa: true, areaEtapa1: (106.38 * 200) / 0.5, loteEtapa1: 200 });
    expect(d.etapa1!.lotes).toBeCloseTo(106.38, 6);
    expect(d.etapa1!.avista).toBeCloseTo(10638000, 2);
    expect(d.etapa1!.prazo).toBeCloseTo(64440631.07, 0);
    // lotes digitados e m² próprio da etapa: à vista = lotes × lote × m²; % sobre a área aproveitável
    const q = calcular({ ...r.inputs, primeiraEtapa: true, lotesEtapa1: 100, loteEtapa1: 250, valorM2Etapa1: 600 });
    expect(q.etapa1!.avista).toBeCloseTo(100 * 250 * 600, 2);
    expect(q.etapa1!.pct).toBeCloseTo((100 * 250) / q.areaUtil, 8);
    expect(q.etapa1!.prazo).toBeCloseTo(q.etapa1!.avista * (q.principal.carteiraEmp / q.vgvAvista), 2);
    // o exemplo combinado: linha de 1.000 m, rua 12, quadra 250, frente 8, lote 220 m², R$ 350/m²
    const ex = { ...r.inputs, primeiraEtapa: true, areaPerimetralE1: 1000, ruaE1: 12, compQuadraE1: 250, frenteE1: 8, loteEtapa1: 220, valorM2Etapa1: 350 };
    const g = calcular(ex);
    expect(g.etapa1!.quadras).toMatchObject({ fundo: 27.5, ruasEntre: 3, cheias: 3, resto: 214, quarteiroes: 4 });
    // lotes decimais: 250 ÷ 8 = 31,25 por quadra; 214 ÷ 8 = 26,75 na menor; 3 × 31,25 + 26,75 = 120,5
    expect(g.etapa1!.quadras!.porQuadra).toBeCloseTo(31.25, 9);
    expect(g.etapa1!.quadras!.lotesResto).toBeCloseTo(26.75, 9);
    expect(g.etapa1!.quadras!.areaLotes).toBeCloseTo(26510, 6);
    expect(g.etapa1!.quadras!.areaRuas).toBeCloseTo(990, 6);
    expect(g.etapa1!.quadras!.sobra).toBeCloseTo(0, 6);
    expect(g.etapa1!.quadras!.areaTotal).toBeCloseTo(27500, 6);
    expect(g.etapa1!.lotes).toBeCloseTo(120.5, 9);
    expect(g.etapa1!.avista).toBeCloseTo(120.5 * 220 * 350, 2);
    expect(g.etapa1!.prazo).toBeCloseTo(120.5 * 220 * 350 * (g.principal.carteiraEmp / g.vgvAvista), 2);
    // desconto em metros sai do perímetro: 2.000 − 200 = 1.800 m de linha para a conta
    const d2 = calcular({ ...ex, areaPerimetralE1: 2000, descontoE1: 200 });
    const l1800 = calcular({ ...ex, areaPerimetralE1: 1800 });
    expect(d2.etapa1!.quadras).toMatchObject({ perimetro: 2000, desconto: 200, linha: 1800 });
    expect(d2.etapa1!.lotes).toBe(l1800.etapa1!.lotes);
    // a área não muda com o desconto (perímetro × fundo); só os lotes
    expect(d2.etapa1!.quadras!.areaTotal).toBeCloseTo(2000 * 27.5, 6);
    expect(d2.etapa1!.avista).toBeCloseTo(l1800.etapa1!.avista, 2);
    // ruas obrigatórias: 2 × 12 m saem do perímetro, como o desconto (1.000 − 24 = 976 m para a conta)
    const ob = calcular({ ...ex, ruasObrigE1: 2 });
    expect(ob.etapa1!.quadras).toMatchObject({ ruasObrig: 2, obrigM: 24, linha: 976 });
    expect(ob.etapa1!.lotes).toBeCloseTo(calcular({ ...ex, areaPerimetralE1: 976 }).etapa1!.lotes, 9);
    expect(ob.etapa1!.quadras!.areaTotal).toBeCloseTo(1000 * 27.5, 6);
    // comprimento do lote informado: lote = frente × comprimento (8 × 30 = 240 m²)
    const cl = calcular({ ...ex, compLoteE1: 30 });
    expect(cl.etapa1!.lote).toBe(240);
    expect(cl.etapa1!.quadras!.fundo).toBeCloseTo(30, 9);
    // a definir: a etapa existe, sem números
    const ad = calcular({ ...ex, etapaADefinir: true });
    expect(ad.etapa1).toBe(null);
    expect(ad.etapa1ADefinir).toBe(true);
    // desligada: não existe primeira etapa
    expect(calcular({ ...r.inputs, lotesEtapa1: null, primeiraEtapa: false, areaEtapa1: 40000 }).etapa1).toBe(null);
    // sem o valor do m² do lote da 1ª etapa não calcula (não usa o m² do estudo): "a definir"
    const sem = calcular({ ...r.inputs, primeiraEtapa: true, areaPerimetralE1: 1000, ruaE1: 12, frenteE1: 8, loteEtapa1: 220, valorM2Etapa1: null });
    expect(sem.etapa1).toBe(null);
    expect(sem.etapa1FaltaValor).toBe(true);
    expect(sem.etapa1ADefinir).toBe(true);
    // proposta antiga (só lotes) abre com a opção ligada e os mesmos números
    const antiga = parseInputs({ ...r.inputs });
    expect(antiga.primeiraEtapa).toBe(true);
    expect(calcular(antiga).etapa1!.prazo).toBeCloseTo(64440631.07, 0);
    expect(r.antecipacao.valor).toBeCloseTo(27731053.87, 0);
    expect(r.antecipacao.jurosMes1).toBeCloseTo(277310.54, 0);
    expect(r.antecipacao.multiplicador).toBeCloseTo(10.8926, 4);
    expect(r.antecipacao.rentabilidade).toBeCloseTo(302061992.13, -1);
    expect(r.antecipacao.ultimaBase).toBeCloseTo(3020619.92, 0);
  });

  it("quantidades de infraestrutura pela aba Custo (vias vazias = metade do não aproveitável)", () => {
    // vias 25% de 137.338,46 = 34.334,62 m² ÷ via de 12 m = 2.861,22 m; rua de 8 m
    expect(r.infra.rede).toBeCloseTo(2861.22, 2);
    expect(r.infra.logradouros).toBeCloseTo(22889.74, 2);
    expect(r.infra.ligacoes).toBeCloseTo(343.34615 * 6, 2);
    expect(r.infra.eletrica).toBeCloseTo(343.34615 * 8 * 1.1, 2);
    // guias e calçadas: a planilha não calcula; continuam pela proporção com o São Judas (PDF)
    expect(r.infra.guias).toBeCloseTo(5955.91, 2);
    expect(r.infra.calcadas).toBeCloseTo(11911.82, 2);
    expect(r.infra.arvores).toBe(343);
  });

  it("planilha nova (2026) com os dados da Fazenda Rancho Fundo", () => {
    const base = { areaTotal: 382894, aproveitamento: 0.5616, metragemLote: 1000, frenteLote: 15, viasPct: 0.221282, larguraVia: 12, larguraCalcada: 2 };
    const c = calcular({ ...base, planilhaInfra: "2026" });
    expect(c.infra.logradouros).toBeCloseTo(56485.0334, 3); // C30
    expect(c.infra.rede).toBeCloseTo(7060.6292, 3); // C33
    expect(c.infra.eletrica).toBeCloseTo(7060.6292, 3); // CUSTOS H24 = C33
    expect(c.infra.ligacoes).toBeCloseTo(215.03327 * 11, 3); // CUSTOS H36 = (rua 8 + 3) × lotes
    expect(c.infra.calcadas).toBeCloseTo(84727.5501 - 56485.0334, 3); // C31 + C32
    expect(c.infra.guias).toBeCloseTo(7060.6292 * 2, 3); // CUSTOS H31
    expect(c.infra.reservatorio).toBe(2); // CUSTOS H37 (2,15, mostrado sem casas)
    expect(c.infra.casaQuimica).toBe(1);
    // sem a marca, continua a planilha anterior
    expect(calcular({ ...base, planilhaInfra: null }).infra.eletrica).toBeCloseTo(3548.0489616, 6);
  });

  it("quantidades iguais às da aba Custo da planilha Chacreamento Condomínio (Fazenda Rancho Fundo)", () => {
    const c = calcular({ areaTotal: 382894, aproveitamento: 0.5616, metragemLote: 1000, frenteLote: 15, viasPct: 0.221282, larguraVia: 12, larguraCalcada: 2, planilhaInfra: null });
    expect(c.lotes).toBeCloseTo(215.03327, 5); // F53
    expect(c.infra.logradouros).toBeCloseTo(56485.03340533333, 6); // F57
    expect(c.infra.rede).toBeCloseTo(7060.629175666666, 6); // F58
    expect(c.infra.ligacoes).toBeCloseTo(1290.1996224, 6); // F59
    expect(c.infra.eletrica).toBeCloseTo(3548.0489616, 6); // F60
    expect(c.infra.arvores).toBe(215); // O40 (215,03)
  });

  it("Plano de Venda 02 do print", () => {
    const p = r.plano02;
    expect(p.lote.inc).toBeCloseTo(60000, 6);
    expect(p.corretagem.total).toBeCloseTo(5000, 6);
    expect(p.corretagem.ter).toBeCloseTo(2000, 6);
    expect(p.entrada.total).toBeCloseTo(8000, 6);
    expect(p.entrada.inc).toBeCloseTo(4800, 6);
    expect(p.parcelaEntrega.inc).toBeCloseTo(16200, 6);
    expect(p.parcelaEntrega.ter).toBeCloseTo(10800, 6);
    expect(p.balao.total).toBeCloseTo(5000, 6);
    expect(p.remanescente.total).toBeCloseTo(55000, 6);
    expect(p.remanescente.pct).toBeCloseTo(0.55, 10);
    expect(p.remanescente.ter).toBeCloseTo(22000, 6);
  });
});

describe("corretor da parceria (intermediação)", () => {
  const base = { areaTotal: 100000, metragemLote: 360, frenteLote: 12, aproveitamento: 0.5, valorM2Etapa1: 500, incorporadorPct: 0.6 };
  it("sem corretor: nada muda", () => {
    const r = calcular(base);
    expect(r.intermediacaoPct).toBe(0);
    expect(r.jblPct).toBeCloseTo(0.6 - r.infraPct, 10);
  });
  it("corretor 2% sobre os % de quem paga (incorporador inteiro, terrenista ou os dois)", () => {
    // 2% dos 60% do incorporador = 1,2% do total, que sai da parte da JBL; obras não mudam
    const r = calcular({ ...base, intermediacaoPct: 0.02 });
    const jbl = 0.6 - r.infraPct;
    expect(r.intermediacaoPct).toBeCloseTo(0.012, 10);
    expect(r.jblPct).toBeCloseTo(jbl - 0.012, 10);
    expect(r.terrenistaPct - r.intermediacaoDeTer + r.jblPct + r.intermediacaoPct + r.infraPct).toBeCloseTo(1, 10);
    // só do terrenista: 2% dos 40%
    const t = calcular({ ...base, intermediacaoPct: 0.02, intermediacaoOrigem: "ter" });
    expect(t.intermediacaoDeTer).toBeCloseTo(0.008, 10);
    expect(t.jblPct).toBeCloseTo(jbl, 10);
    // dos dois: 2% dos 60% + 2% dos 40%
    const a = calcular({ ...base, intermediacaoPct: 0.02, intermediacaoOrigem: "ambos" });
    expect(a.intermediacaoPct).toBeCloseTo(0.02, 10);
    expect(a.infraPct).toBeCloseTo(r.infraPct, 12);
  });
});

// Planilha "JBL Planilha Infla 2026" preenchida com os dados da Fazenda Rancho Fundo e recalculada
// (todas as fórmulas, abas DADOS DO PARCELAMENTO, CARTEIRA e CUSTOS; quadra máxima de 200 m)
describe("planilha 2026 recalculada com os dados da Fazenda Rancho Fundo", () => {
  const r = calcular({
    areaTotal: 382894, aproveitamento: 0.5616, metragemLote: 1000, frenteLote: 15, viasPct: 0.221282, larguraVia: 12, larguraCalcada: 2, quadraMax: 200,
    valorM2: 270, corretorPct: 0.05, ipca: 0.04, jurosAno: 0, jurosMes: 0.0067, entradaPct: 0.06, multiplicador: 1.654, anos: 20, incorporadorPct: 0.6, valorM2Etapa1: 270,
  });
  it("dados do parcelamento", () => {
    expect(r.lotes).toBeCloseTo(215.0332704, 7); // C19
    expect(r.parcela).toBeCloseTo(1749.105, 6); // G28 pagamento em dia
    expect(r.parcelaContrato).toBeCloseTo(1943.45, 6); // G29
    expect(r.valorLoteContrato).toBeCloseTo(482628, 4); // G30
    expect(r.vgvAvistaTer).toBeCloseTo(23223593.2032, 4); // F35
  });
  it("carteira com a entrada (CARTEIRA C39, D39, E39)", () => {
    expect(r.principal.carteiraEmp).toBeCloseTo(330195543.942732, 3);
    expect(r.principal.carteiraInc).toBeCloseTo(198117326.365639, 3);
    expect(r.principal.carteiraTer).toBeCloseTo(132078217.577093, 3);
    expect(r.principal.mensalTer).toBeCloseTo(150446.3073692, 5); // E38
    expect(r.principal.parcelaFinal).toBeCloseTo(15167.178018293, 6); // C25 (20º ano)
  });
  it("quantidades de obra (aba CUSTOS)", () => {
    expect(r.infra.logradouros).toBeCloseTo(56485.0334053, 6); // H28
    expect(r.infra.rede).toBeCloseTo(7060.6291757, 6); // G32 / G45
    expect(r.infra.eletrica).toBeCloseTo(7060.6291757, 6); // H24
    expect(r.infra.guias).toBeCloseTo(14121.2583513, 6); // H31
    expect(r.infra.calcadas).toBeCloseTo(28242.5167027, 6); // C31 + C32
    expect(r.infra.ligacoes).toBeCloseTo(2365.3659744, 6); // H36
    expect(r.infra.ligacoesEsgoto).toBeCloseTo(2580.3992448, 6); // H50
    expect(r.infra.drenagem).toBeCloseTo(1412.1258351, 6); // G58
    expect(r.infra.bigode).toBeCloseTo(198.8371127, 6); // H64
    expect(r.infra.reservatorio).toBe(2); // H37 = 2,15
    expect(r.infra.pocosVisita).toBe(25 + 19); // H65 = 24,86 e H55 = 18,64, sem casas
    expect(r.infra.bocaLobo).toBe(50); // H67 = 49,71
  });
});
