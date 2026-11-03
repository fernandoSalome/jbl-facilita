/**
 * Orçamento das obras da planilha "JBL_Planilha(+)Infra_Ultima atualizacao_2026" (01/11/2026), aba CUSTOS:
 * quantidade × preço da região (aba Planilha1). Vale para as propostas marcadas com `planilhaNova`
 * (rascunhos de 03/11/2026 e as criadas depois); as outras continuam com área aproveitável × custo por m².
 *
 * Os preços da planilha são os do Centro-Oeste × o fator da região. As quantidades são as mesmas da
 * planilha (iguais às de hoje no sistema). Itens que a planilha nova deixa em zero, para digitar à mão
 * (supressão vegetal, terraplanagem, poço, estação de esgoto, construções), ficam de fora. Metros da rede de
 * energia, reservatório, registro e casa química aparecem com zero, como na planilha (pedido de 02/11/2026:
 * o teste tem que bater exatamente com ela).
 */

export const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"] as const;
export type Regiao = (typeof REGIOES)[number];

/** Planilha1 K5:K9: fator sobre o preço do Centro-Oeste */
export const FATOR_REGIAO: Record<Regiao, number> = { Norte: 1.08, Nordeste: 0.96, "Centro-Oeste": 1, Sudeste: 1.08, Sul: 1.04 };

const UF_REGIAO: Record<string, Regiao> = {
  AC: "Norte", AP: "Norte", AM: "Norte", PA: "Norte", RO: "Norte", RR: "Norte", TO: "Norte",
  AL: "Nordeste", BA: "Nordeste", CE: "Nordeste", MA: "Nordeste", PB: "Nordeste", PE: "Nordeste", PI: "Nordeste", RN: "Nordeste", SE: "Nordeste",
  DF: "Centro-Oeste", GO: "Centro-Oeste", MT: "Centro-Oeste", MS: "Centro-Oeste",
  ES: "Sudeste", MG: "Sudeste", RJ: "Sudeste", SP: "Sudeste",
  PR: "Sul", RS: "Sul", SC: "Sul",
};
export const regiaoDaUf = (uf?: string | null): Regiao => UF_REGIAO[(uf ?? "").toUpperCase()] ?? "Centro-Oeste";

/** Planilha1 N3:U20, Centro-Oeste: base e sub-base, revestimento e aplicação (R$/m²) */
export const PAVIMENTOS: Record<string, [base: number, revestimento: number, aplicacao: number]> = {
  Cascalhamento: [8, 5, 4],
  TSD: [38, 32, 14],
  "CBUQ 3 cm": [22, 68, 18],
  Paralelepípedo: [22, 38, 22],
  "Paver 8 cm": [22, 65, 25],
  "Concreto 15 cm": [22, 88, 20],
};

export type Implanta = { canteiro: boolean; energia: boolean; agua: boolean; esgoto: boolean; drenagem: boolean; paisagismo: boolean };
/** CUSTOS C64:C69: canteiro "Não", o resto "Sim" */
export const IMPLANTA_PADRAO: Implanta = { canteiro: false, energia: true, agua: true, esgoto: true, drenagem: true, paisagismo: true };

export type OpcoesOrcamento = {
  regiao: Regiao;
  pavimento: string;
  energia: "aerea" | "subterranea";
  implanta: Implanta;
  /** CUSTOS C3: meses de obra (custos mensais do canteiro) */
  mesesObra: number;
};

/** Quantidades do estudo (as mesmas que o sistema já calcula) */
export type Quantidades = {
  lotes: number;
  /** DADOS C36: comprimento das ruas = área de vias ÷ largura da via (m) */
  ruas: number;
  /** DADOS C32: largura da rua sem as calçadas (m) */
  larguraRua: number;
  /** DADOS C33: área da rua (m²) */
  areaRua: number;
  /** DADOS C39: poços de visita da drenagem (null = sem o tamanho da quadra: "a projetar") */
  pvDrenagem: number | null;
};

export type Item = { nome: string; qtd: number; unid: string; preco: number; total: number };
export type Grupo = { nome: string; implanta: boolean; itens: Item[]; total: number; aProjetar?: string };
export type Orcamento = { regiao: Regiao; grupos: Grupo[]; total: number };

export function orcamento2026(q: Quantidades, o: OpcoesOrcamento): Orcamento {
  const f = FATOR_REGIAO[o.regiao];
  const it = (nome: string, qtd: number, unid: string, precoCO: number): Item => {
    const preco = precoCO * f;
    return { nome, qtd, unid, preco, total: qtd * preco };
  };
  const soma = (itens: Item[]) => itens.reduce((s, x) => s + x.total, 0);
  const pv = q.pvDrenagem;
  const semQuadra = "Preencha o tamanho máximo da quadra para calcular poços de visita, bocas de lobo e bigode";

  // CUSTOS E4:I11
  const meses = Math.max(0, o.mesesObra);
  const canteiro = [
    it("Implantação e ligação de um ponto de água", 1, "un.", 500),
    it("Implantação e ligação de um ponto de energia", 1, "un.", 1500),
    it("Preparo do canteiro de obra", 1, "verba", 15000),
    it("Alarme e monitoramento (mensal)", meses, "meses", 450),
    it("Acompanhamento de um engenheiro (mensal)", meses, "meses", 6000),
    it("Acompanhamento da topografia (mensal)", meses, "meses", 1000),
    it("Aluguel de container (mensal)", meses, "meses", 800),
  ];

  // CUSTOS E23:I26: a planilha deixa os metros da rede em zero (H24/H25); a iluminação conta pelas ruas
  const energia = [
    o.energia === "subterranea"
      ? it("Rede de energia subterrânea", 0, "m", 825)
      : it("Rede de energia aérea", 0, "m", 275),
    it("Iluminação pública (1 ponto a cada 30 m)", q.ruas / 30, "pontos", 300),
  ];

  // CUSTOS E27:I31
  const [base, rev, apl] = PAVIMENTOS[o.pavimento] ?? PAVIMENTOS.Cascalhamento;
  const pavimentacao = [
    it(`Base e sub-base (${o.pavimento})`, q.areaRua, "m²", base),
    it(`Pavimentação (${o.pavimento})`, q.areaRua, "m²", rev),
    it("Aplicação, mão de obra", q.areaRua, "m²", apl),
    it("Guia e sarjeta", q.ruas * 2, "m", 40),
  ];

  // CUSTOS E32:I44
  const ligAgua = (q.larguraRua + 3) * q.lotes;
  // H37 e H42 em zero na planilha (registro = H37)
  const reservatorios = 0;
  const redeAgua = it("Rede de água 50 mm", q.ruas, "m", 20.5);
  const ligacoesAgua = it("Ligações de água", ligAgua, "m", 5);
  const agua = [
    redeAgua,
    ligacoesAgua,
    it("Reservatório (1 a cada 100 lotes)", reservatorios, "un.", 120000),
    // conexões: 20% de rede + ligações (o preço já está na região)
    { nome: "Conexões e outros (20%)", qtd: 0.2, unid: "×", preco: redeAgua.total + ligacoesAgua.total, total: 0.2 * (redeAgua.total + ligacoesAgua.total) },
    it("Registro (1 por reservatório)", reservatorios, "un.", 5000),
    it("Casa química", 0, "un.", 56000),
    it("Mão de obra", q.ruas + ligAgua, "m", 2),
    it("Hora máquina (1 a cada 400 m)", q.ruas / 400, "h", 4000),
  ];

  // CUSTOS E45:I57
  const ligEsgoto = (q.larguraRua + 4) * q.lotes;
  const redeEsgoto = it("Rede de esgoto 100 mm", q.ruas, "m", 35.2);
  const ligacoesEsgoto = it("Ligações de esgoto", ligEsgoto, "m", 35.2);
  const esgoto = [
    redeEsgoto,
    ligacoesEsgoto,
    { nome: "Conexões e outros (20%)", qtd: 0.2, unid: "×", preco: redeEsgoto.total + ligacoesEsgoto.total, total: 0.2 * (redeEsgoto.total + ligacoesEsgoto.total) },
    ...(pv === null ? [] : [it("Poços de visita do esgoto", pv / 1.3333, "un.", 2700)]),
    it("Mão de obra", q.ruas + ligEsgoto, "m", 2),
    it("Hora máquina (1 a cada 400 m)", q.ruas / 400, "h", 4000),
  ];

  // CUSTOS E58:I70
  const metrosDrenagem = q.ruas * 0.2;
  const drenagem = [
    it("Tubo de 600 mm", metrosDrenagem, "m", 135.16),
    ...(pv === null
      ? []
      : [
          it("Tubo de 400 mm, bigode", pv * q.larguraRua, "m", 119.02),
          it("Poços de visita da drenagem", pv, "un.", 4800),
          it("Bocas de lobo duplas", pv * 2, "un.", 4200),
        ]),
    it("Mão de obra", metrosDrenagem, "m", 12),
    it("Hora máquina (1 a cada 400 m)", metrosDrenagem / 400, "h", 10000),
  ];

  // CUSTOS E71:I76
  const paisagismo = [it("Árvore por lote", q.lotes, "un.", 45), it("Plantio", q.lotes, "un.", 35)];

  const grupos: Grupo[] = (
    [
      ["Canteiro de obra", o.implanta.canteiro, canteiro, undefined],
      ["Energia", o.implanta.energia, energia, undefined],
      ["Pavimentação", true, pavimentacao, undefined],
      ["Rede de água", o.implanta.agua, agua, undefined],
      ["Rede de esgoto", o.implanta.esgoto, esgoto, pv === null ? semQuadra : undefined],
      ["Drenagem", o.implanta.drenagem, drenagem, pv === null ? semQuadra : undefined],
      ["Paisagismo", o.implanta.paisagismo, paisagismo, undefined],
    ] as const
  ).map(([nome, implanta, itens, aProjetar]) => ({ nome, implanta, itens: [...itens], total: implanta ? soma([...itens]) : 0, aProjetar }));

  return { regiao: o.regiao, grupos, total: grupos.reduce((s, g) => s + g.total, 0) };
}
