import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { areaPorTexto, distribuir, frases, perguntar, professor, progresso, proximaEtapa, telefoneWa, validarArea, type Resposta } from "./captacao";
import { hectares, kmlDoKmz, lerKml } from "./kml";

describe("distribuir", () => {
  it("manda cada frase para a seção certa, com a origem", () => {
    const r = distribuir("A matrícula está no nome dos 3 irmãos. Tem poste da CPFL na frente. Lote vizinho a R$ 600 o m²", "whatsapp", "Pedro · 19/11", "x");
    expect(r.map((x) => [x.secao, x.pergunta])).toEqual([[2, "Matrícula"], [18, "Rede de energia"], [8, "Preço do lote na região"]]);
    expect(r[0]).toMatchObject({ fonte: "whatsapp", ref: "Pedro · 19/11", em: "x" });
  });
  it("não corta número com ponto e manda o resto para anotação", () => {
    expect(frases("Área de 21.4 ha. ok")).toEqual(["Área de 21.4 ha"]);
    expect(distribuir("Visitei hoje com o Marcelo", "manual", "eu")[0]).toMatchObject({ secao: 28, pergunta: "Anotação" });
  });
});

const chk = (xs: Partial<Resposta>[]): Resposta[] => xs.map((x) => ({ secao: 0, pergunta: "", resposta: "", fonte: "manual", ref: "", em: "", ...x }));

describe("progresso", () => {
  it("vazio é 0% e cada seção vale no mínimo 3", () => {
    const p = progresso([]);
    expect(p.pct).toBe(0);
    expect(p.total).toBeGreaterThanOrEqual(90);
  });
});

describe("perguntar", () => {
  it("acha pela palavra e prefere a fonte mais forte", () => {
    const c = chk([{ secao: 4, pergunta: "Zona", resposta: "ZRDS, lote 300 m²", fonte: "whatsapp" }, { secao: 4, pergunta: "Zona", resposta: "ZRDS pela lei 13.123", fonte: "documento" }, { secao: 8, pergunta: "Preço", resposta: "R$ 600" }]);
    const r = perguntar(c, "Qual a zona?");
    expect(r).toHaveLength(2);
    expect(r[0].fonte).toBe("documento");
  });
});

describe("professor", () => {
  it("sem nada: nota 0 e pede ao proprietário pelo nome", () => {
    const p = professor({ hectares: null, checklist: [], conversas: [{ papel: "proprietario", nome: "Pedro" }] });
    expect(p.nota).toBe(0);
    expect(p.questoes.find((q) => q.categoria === "Jurídica")?.pedirA).toBe("Pedro");
  });
  it("aponta contradição de tamanho com o KMZ", () => {
    const p = professor({ hectares: 21.4, checklist: chk([{ secao: 0, pergunta: "Nome", resposta: "uns 22 ha", fonte: "whatsapp", ref: "Pedro" }]), conversas: [] });
    expect(p.questoes[0].texto).toContain("22 ha");
  });
  it("prova documental conta inteiro, relato conta meio", () => {
    const docs = chk([2, 4, 7, 8, 17, 1].map((s, i) => ({ secao: s, pergunta: ["Matrícula", "Zona", "Córregos e nascentes", "Preço do lote na região", "Viabilidade de água e esgoto", "Aceita parceria?"][i], fonte: "documento" as const, resposta: "x" })));
    expect(professor({ hectares: null, checklist: docs, conversas: [] }).nota).toBe(9);
  });
});

describe("cadastro", () => {
  it("exige dono ou corretor", () => {
    expect(validarArea({ cidade: "Sorocaba", uf: "SP" })).toEqual({ erro: "Informe o proprietário ou o corretor" });
    expect(validarArea({ cidade: "Sorocaba", uf: "sp", corretor: "Rita", hectares: "21,4" })).toMatchObject({ dados: { uf: "SP", hectares: 21.4 } });
  });
  it("etapas e telefone", () => {
    expect(proximaEtapa("captacao")).toBe("previabilidade");
    expect(proximaEtapa("contrato")).toBeNull();
    expect(telefoneWa("(11) 98123-4410")).toBe("5511981234410");
  });
  it("acha a área citada pelo nome do dono antes da cidade", () => {
    const as = [{ id: "a", nome: "", cidade: "Sorocaba", dono: "Marcos", corretor: null }, { id: "b", nome: "Sítio do Pedro", cidade: "Sorocaba", dono: "Pedro Almeida", corretor: null }];
    expect(areaPorTexto("passei no sítio do pedro hoje", as).map((a) => a.id)).toEqual(["b"]);
    expect(areaPorTexto("em Sorocaba choveu", as)).toHaveLength(2);
  });
});

describe("kml", () => {
  const kml = "<kml><Polygon><coordinates>-47.0,-23.0,0 -47.001,-23.0,0 -47.001,-23.001,0 -47.0,-23.001,0</coordinates></Polygon></kml>";
  it("lê o polígono e mede a área", () => {
    const p = lerKml(kml)!;
    expect(p).toHaveLength(4);
    expect(hectares(p)).toBeCloseTo(1.14, 1);
  });
  it("abre o kml de dentro do kmz", () => {
    const dados = deflateRawSync(Buffer.from(kml));
    const nome = Buffer.from("doc.kml");
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0);
    h.writeUInt16LE(8, 8);
    h.writeUInt32LE(dados.length, 18);
    h.writeUInt16LE(nome.length, 26);
    expect(kmlDoKmz(Buffer.concat([h, nome, dados]))).toBe(kml);
  });
});

describe("limpar conversa", () => {
  it("tira mídia e conversa vazia, junta linhas quebradas", async () => {
    const { limparConversa } = await import("./captacao");
    const t = "19/11/2026 10:42 - Rita: o Vista Verde vendeu 70% em 14 meses\ncom lote de 300 m²\n19/11/2026 10:43 - Rita: <Mídia oculta>\n19/11/2026 10:44 - Eu: ok";
    expect(limparConversa(t)).toEqual([{ quando: "19/11/2026", quem: "Rita", texto: "o Vista Verde vendeu 70% em 14 meses com lote de 300 m²" }]);
  });
});

describe("cidade do KMZ", async () => {
  const { cidadeDoEndereco } = await import("./kml");
  it("lê cidade e UF do OpenStreetMap", () => {
    expect(cidadeDoEndereco({ address: { city: "Sorocaba", "ISO3166-2-lvl4": "BR-SP" } })).toEqual({ cidade: "Sorocaba", uf: "SP" });
    expect(cidadeDoEndereco({ address: { town: "Japaratinga", "ISO3166-2-lvl4": "BR-AL" } })).toEqual({ cidade: "Japaratinga", uf: "AL" });
    expect(cidadeDoEndereco({ address: { country: "Brasil" } })).toBeNull();
  });
});

describe("impressão do polígono", async () => {
  const { impressaoPoligono } = await import("./poligono");
  it("igual para o mesmo KMZ, diferente para outro", () => {
    const a: [number, number][] = [[-47.1, -23.1], [-47.2, -23.1], [-47.2, -23.2]];
    expect(impressaoPoligono(a)).toBe(impressaoPoligono(a.map(([x, y]) => [x + 1e-7, y] as [number, number])));
    expect(impressaoPoligono(a)).not.toBe(impressaoPoligono([...a, [-47.1, -23.2]]));
  });
});
