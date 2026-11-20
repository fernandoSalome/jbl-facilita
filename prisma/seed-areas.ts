/**
 * Pedido do Fernando (19/11/2026): as áreas já estudadas (raio-x de Sorocaba, Atibaia e São Roque) entram na
 * Captação na etapa Pré-viabilidade, com o polígono do KMZ e o checklist preenchido pelo raio-x.
 * Uma vez só: se já existe área com o mesmo link de relatório (mesmo apagada), não faz nada.
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { hectares, type Poligono } from "../src/lib/kml";
import type { Resposta } from "../src/lib/captacao";
import poligonos from "./dados/poligonos-estudos.json";

const EM = "2026-11-19T12:00:00.000Z";
const rx = (secao: number, pergunta: string, resposta: string, ref: string): Resposta => ({ secao, pergunta, resposta, fonte: "raiox", ref, em: EM });

const ESTUDOS: { chave: keyof typeof poligonos; nome: string; cidade: string; dono: string | null; relatorio: string; checklist: Resposta[]; conclusao: string }[] = [
  {
    chave: "sorocaba",
    nome: "Terreno do Marcos",
    cidade: "Sorocaba",
    dono: "Marcos",
    relatorio: "https://claude.ai/artifact/5Bt842BwwnapKvfYQ3zsRc",
    checklist: [
      rx(4, "Zona", "ZRDS (ponta em CCS1), lote mínimo 300 m² com testada de 12 m", "Lei 13.123/2025, Quadro 04 · mapa 02"),
      rx(4, "Macrozona", "100% em MME (manancial): regras do art. 15", "Lei 13.123/2025 · mapa 01"),
      rx(4, "Áreas públicas", "25% (17,5 + 7,5) + 5% institucional; APP pode contar como área pública", "Lei 13.123/2025, art. 132"),
      rx(5, "Esgoto", "Em ZRDS o loteador paga as redes externas", "Lei 13.123/2025, art. 25 §1"),
      rx(0, "Perímetro com infra", "Frente de 390 m", "raio-x 18/11/2026"),
      rx(7, "Córregos e nascentes", "APP pela hidrografia oficial: 117.890 m² no pior caso. Precisa de laudo", "raio-x 18/11/2026"),
      rx(7, "Mata", "Copa de árvores em cerca de 35% da área", "raio-x · foto de satélite"),
      rx(18, "Linha de transmissão", "Faixa da LT: 7.558 m²", "raio-x · OpenStreetMap"),
      rx(22, "Faixa de domínio", "Faixa de 15 m da rodovia: 3.622 m²", "Lei 13.123/2025, art. 132 §6"),
      rx(12, "Produto sugerido", "Lotes de 300 m²: 27 (pior) / 167 (médio) / 283 (bom)", "raio-x 18/11/2026"),
    ],
    conclusao: "Viável com ressalvas: a zona permite lote de 300 m², mas o número de lotes vai de 27 a 283 conforme o que a hidrografia oficial for de fato. Laudo de córregos antes da proposta.",
  },
  {
    chave: "atibaia",
    nome: "Gleba Estrada dos Pires",
    cidade: "Atibaia",
    dono: null,
    relatorio: "https://claude.ai/artifact/Fd1Z7teQ1GMvSfSssHdqjs",
    checklist: [
      rx(4, "Zona", "ZP17M8, lote mínimo 4.000 m² (prevalece a zona com maior proporção)", "LC 952/2025, art. 279 · KMZ de zoneamento 07/2026"),
      rx(4, "Lote mínimo", "Pela minuta antiga seria 800 m² (134 lotes); no mapa vigente, 4.000 m²", "raio-x · comparação minuta × mapa 07/2026"),
    ],
    conclusao: "Pelo mapa vigente (07/2026), lote de 4.000 m²: produto de chácara. A conta de 134 lotes de 800 m² só valeria pela minuta antiga.",
  },
  {
    chave: "saoroque",
    nome: "Gleba 8,7 ha",
    cidade: "São Roque",
    dono: null,
    relatorio: "https://claude.ai/artifact/FEgkhPXwYBoTcp2woJqBDU",
    checklist: [
      rx(4, "Zona", "ZUR-md, lote mínimo 250 m²", "LC 40/2006, Quadro VIII (redação da LC 66/2012)"),
      rx(4, "Lote mínimo", "LC 107/2021 e LC 125/2022 foram julgadas inconstitucionais: vale a LC 40/2006", "raio-x · conferência das leis"),
      rx(12, "Produto sugerido", "Até 188 lotes de 250 m² (ver cenários pior / médio / bom no raio-x)", "raio-x"),
    ],
    conclusao: "",
  },
];

export async function areasDosEstudos(db: PrismaClient) {
  for (const e of ESTUDOS) {
    if (await db.area.findFirst({ where: { relatorio: e.relatorio }, select: { id: true } })) continue;
    const poligono = poligonos[e.chave] as Poligono;
    await db.area.create({
      data: {
        nome: e.nome,
        cidade: e.cidade,
        uf: "SP",
        dono: e.dono,
        hectares: hectares(poligono),
        etapa: "previabilidade",
        poligono,
        relatorio: e.relatorio,
        checklist: e.checklist as unknown as Prisma.InputJsonValue,
        documentos: { "KMZ da área": "ok", "Raio-x do terreno (Estudo 1)": "ok" },
        conclusao: e.conclusao || null,
      },
    });
    console.log(`Captação: área do estudo criada (${e.cidade} · ${e.nome})`);
  }
}

/**
 * Pedido do Fernando (19/11/2026, 2ª parte): o Estudo 1 das áreas dos estudos com os números do raio-x, e a
 * Biblioteca de cidades com as 3 cidades conferidas. Só preenche o que está vazio (roda uma vez na prática).
 */
const ESTUDO1: Record<string, object> = {
  "https://claude.ai/artifact/5Bt842BwwnapKvfYQ3zsRc": {
    status: "pronto", semaforo: "amarelo", zona: "ZRDS (ponta em CCS1) · MME", loteMinimo: "300 m² / 12 m",
    lotes: { pior: 27, medio: 167, bom: 283 }, produto: "Loteamento aberto, lotes de 300 m²",
    alertas: [
      { texto: "Hidrografia oficial (APP de 29% a 55%)", comoResolver: "laudo hidrológico e vistoria em dia seco" },
      { texto: "Manancial (MME)", comoResolver: "esgoto tratado; viabilidade da concessionária" },
      { texto: "Copa de árvores em cerca de 35% da área", comoResolver: "levantamento da vegetação e licença CETESB" },
      { texto: "Linha de transmissão (faixa de 7.558 m²)", comoResolver: "consulta à concessionária" },
      { texto: "Faixa de 15 m da rodovia (3.622 m²)", comoResolver: "projeto respeitando a faixa" },
    ],
    estrategia: ["Frente de 390 m", "Ponta em corredor CCS1 (comércio na frente)", "Redes externas por conta do loteador (ZRDS)"],
  },
  "https://claude.ai/artifact/Fd1Z7teQ1GMvSfSssHdqjs": {
    status: "pronto", semaforo: "amarelo", zona: "ZP17M8", loteMinimo: "4.000 m²",
    produto: "Chácaras (lote de 4.000 m² no mapa vigente)",
    alertas: [{ texto: "A conta de 134 lotes de 800 m² só valia pela minuta antiga", comoResolver: "certidão de uso do solo antes de qualquer proposta" }],
    estrategia: [],
  },
  "https://claude.ai/artifact/FEgkhPXwYBoTcp2woJqBDU": {
    status: "pronto", zona: "ZUR-md", loteMinimo: "250 m²", lotes: { pior: null, medio: null, bom: 188 },
    produto: "Loteamento de lotes de 250 m²",
    alertas: [{ texto: "LC 107/2021 e LC 125/2022 inconstitucionais", comoResolver: "usar a LC 40/2006 com a LC 66/2012 e pedir certidão" }],
    estrategia: [],
  },
};

const CIDADES = [
  { nome: "Sorocaba", uf: "SP", leis: "Lei 13.123/2025 (Plano Diretor com zoneamento)", mapa: "Mapas 01, 02 e 03 da Lei 13.123/2025", notas: "ADI 2177842-59.2025 só derrubou o art. 163 §2 XV-XVI (Jd. Pagliato). PL 115/2026 (Jd. Astro) e Lei 13.444/2026 (ZEIS) não mudam zonas nem lotes.", conferidoEm: new Date("2026-11-18T12:00:00Z") },
  { nome: "Atibaia", uf: "SP", leis: "LC 905/2023 (Plano Diretor) · LC 952/2025 (Código de Obras e Urbanismo)", mapa: "KMZ de zoneamento oficial 07/2026", alerta: "PLC 18/2025", notas: "A minuta antiga do mapa mudou a zona de áreas: usar só o KMZ de 07/2026.", conferidoEm: new Date("2026-11-18T12:00:00Z") },
  { nome: "São Roque", uf: "SP", leis: "LC 39/2006 · LC 40/2006 (Quadro VIII com a LC 66/2012)", mapa: "Mapa Legal (camada pdm2006), não oficial", alerta: "PLC 3 e 4/2026", notas: "LC 107/2021 e LC 125/2022 julgadas inconstitucionais.", conferidoEm: new Date("2026-11-18T12:00:00Z") },
];

export async function estudosEBiblioteca(db: PrismaClient) {
  for (const [relatorio, e1] of Object.entries(ESTUDO1)) {
    const a = await db.area.findFirst({ where: { relatorio }, select: { id: true, estudo1: true } });
    if (!a || Object.keys((a.estudo1 ?? {}) as object).length) continue;
    await db.area.update({ where: { id: a.id }, data: { estudo1: e1 } });
    console.log(`Captação: Estudo 1 preenchido (${relatorio})`);
  }
  for (const c of CIDADES) {
    if (await db.cidade.findUnique({ where: { nome_uf: { nome: c.nome, uf: c.uf } } })) continue;
    await db.cidade.create({ data: c });
    console.log(`Biblioteca: ${c.nome}-${c.uf}`);
  }
}

/**
 * Pedido do Fernando (19/11/2026): o link do estudo de Sorocaba, para mandar ao corretor, mostra o raio-x
 * completo, com as imagens. Uma vez só: se a área já tem o raio-x completo, não faz nada.
 */
export async function raioXCompletoSorocaba(db: PrismaClient) {
  const a = await db.area.findFirst({ where: { relatorio: "https://claude.ai/artifact/5Bt842BwwnapKvfYQ3zsRc", deletedAt: null }, select: { id: true, relatorioCompleto: true } });
  if (!a || a.relatorioCompleto) return;
  const { readFileSync } = await import("node:fs");
  const { guardarRelatorio } = await import("../src/lib/relatorio-db");
  const r = await guardarRelatorio(db, a.id, readFileSync("prisma/dados/relatorios/sorocaba.html", "utf8"));
  console.log(`Captação: raio-x completo de Sorocaba no link (${r.secoes} seções, ${r.imagens} imagens)`);
}

/**
 * Pedido do Fernando (19/11/2026): os estudos de Alagoas na plataforma, com o KMZ e o raio-x completo no link:
 * Ipioca (Ponta do Prego, 70,8 ha, Maceió) e Barreiras do Boqueirão (6,1 ha, Japaratinga).
 * Uma vez só: se já existe área com o mesmo nome na cidade (mesmo apagada), não faz nada.
 */
const ALAGOAS = [
  {
    chave: "ipioca70" as const,
    arquivo: "prisma/dados/relatorios/ipioca-70ha.html",
    nome: "Gleba Ponta do Prego (Ipioca)",
    cidade: "Maceió",
    dono: null,
    relatorio: "https://claude.ai/artifact/2pm8v615BfNiVyMXaUFLEo",
    estudo1: {
      status: "pronto", semaforo: "amarelo", zona: "ZIT-1 · Macrozona de Restrição à Ocupação", loteMinimo: "1.200 m² / 20 m", aproveitavelPct: 75,
      lotes: { pior: 150, medio: 257, bom: 277 }, produto: "Loteamento de alto padrão pé na areia, lotes de 1.200 a 1.500 m², com a mata a oeste como parque",
      alertas: [
        { texto: "Terreno de marinha e acrescidos (SPU) na ponta e no lado leste", comoResolver: "certidão de situação e LPM homologada na SPU/AL" },
        { texto: "Mata Atlântica (restinga) de 11 a 26 ha e APP do canal", comoResolver: "laudo de vegetação e consulta ao IMA/AL e à SEMURB" },
        { texto: "Lei 5.778 (ZIT-1) sem texto no acervo", comoResolver: "certidão de uso e ocupação do solo na Prefeitura" },
        { texto: "Macroárea de Restrição e erosão costeira", comoResolver: "diretrizes urbanísticas, saneamento próprio e estudo de recuo do mar" },
        { texto: "Novo Plano Diretor em tramitação (PL 113/2026)", comoResolver: "protocolar diretrizes antes da sanção" },
      ],
      estrategia: ["Uma das últimas pontas de praia livres de Maceió", "Plana, sem risco geológico e sem mineração", "Acesso à praia não pode ser bloqueado (condomínio)"],
    },
  },
  {
    chave: "japaratinga" as const,
    arquivo: "prisma/dados/relatorios/japaratinga-6ha.html",
    nome: "Barreiras do Boqueirão",
    cidade: "Japaratinga",
    dono: "Flávio",
    relatorio: null,
    estudo1: {
      status: "pronto", semaforo: "amarelo", zona: "ZM (94%) · ponta em ZL", loteMinimo: "150 m² / 7 m", aproveitavelPct: 83,
      lotes: { pior: 81, medio: 97, bom: 113 }, produto: "Lotes de 250 m² (10 × 25 m); fase 1 por desmembramento nas ruas existentes (~44 lotes)",
      alertas: [
        { texto: "6 casas dentro do polígono e vizinhos sobre a divisa norte", comoResolver: "matrícula, cadeia dominial e levantamento cadastral" },
        { texto: "A AL-101 e duas ruas de terra cortam a área", comoResolver: "conferir na matrícula e na Prefeitura se as ruas são oficiais; DER-AL" },
        { texto: "Zona lida em cópia de 10/2022 do mapa", comoResolver: "certidão de uso do solo e caderno de mapas oficial da LC 680/2022" },
        { texto: "Ponta do mar em ZL, provável terreno de marinha, praia na APA Costa dos Corais", comoResolver: "certidão da SPU e consulta ao ICMBio" },
        { texto: "Pesquisa de areia (ANM 844039/2024) colada na divisa oeste", comoResolver: "acompanhar o processo na ANM" },
      ],
      estrategia: ["Cerca de 636 m de frente para ruas que já existem", "Fase 1 rápida por desmembramento, sem doar área"],
    },
  },
];

const CIDADES_AL = [
  { nome: "Maceió", uf: "AL", leis: "Plano Diretor Lei 5.486/2005 · Código de Urbanismo Lei 5.593/2007 · Lei 5.631/2007 (Quadro 1 da ZIT-1) · Lei 5.778/2009", mapa: "Mapa 01 do Código de Urbanismo (PDF com grade UTM deslocada ~1,2 km)", alerta: "Novo Plano Diretor (PL 113/2026) na Câmara", notas: "Ipioca: Macrozona de Restrição à Ocupação; litoral norte em ZIT-1 (lote 1.200 m², testada 20 m). APA Costa dos Corais ampliada pelo Decreto 12.490/2025.", conferidoEm: new Date("2026-11-19T12:00:00Z") },
  { nome: "Japaratinga", uf: "AL", leis: "Plano Diretor LC 680/2022 (zoneamento e parcelamento no Anexo II)", mapa: "Anexo 1 do PD (cópia pública de 10/2022; caderno oficial fora do ar)", alerta: "Mapa oficial indisponível no site da Prefeitura", notas: "ZC 150 m² · ZM 150 m²/7 m (15% + 5%) · ZL 300 m²/15 m (40% + 5%) · ZEIS 125 m² · ZI 500 m². ZL é a faixa entre o mar e a AL-101.", conferidoEm: new Date("2026-11-19T12:00:00Z") },
];

export async function estudosDeAlagoas(db: PrismaClient) {
  const { readFileSync } = await import("node:fs");
  const { guardarRelatorio } = await import("../src/lib/relatorio-db");
  for (const e of ALAGOAS) {
    if (await db.area.findFirst({ where: { nome: e.nome, cidade: e.cidade }, select: { id: true } })) continue;
    const poligono = poligonos[e.chave] as Poligono;
    const a = await db.area.create({
      data: {
        nome: e.nome, cidade: e.cidade, uf: "AL", dono: e.dono, hectares: hectares(poligono), etapa: "previabilidade", poligono, relatorio: e.relatorio,
        estudo1: e.estudo1, documentos: { "KMZ da área": "ok", "Raio-x do terreno (Estudo 1)": "ok" },
      },
    });
    const r = await guardarRelatorio(db, a.id, readFileSync(e.arquivo, "utf8"), e.dono ? ["Flavio Parceiro", "Flavio", e.dono] : []);
    console.log(`Captação: ${e.cidade} · ${e.nome} criada com o raio-x completo (${r.secoes} seções, ${r.imagens} imagens)`);
  }
  for (const c of CIDADES_AL) {
    if (await db.cidade.findUnique({ where: { nome_uf: { nome: c.nome, uf: c.uf } } })) continue;
    await db.cidade.create({ data: c });
    console.log(`Biblioteca: ${c.nome}-${c.uf}`);
  }
}

/**
 * Pedido do Fernando (20/11/2026): os loteamentos que já existem entram no funil de Projetos, cada um como uma
 * área ligada ao loteamento (projectId). O KMZ vem depois. As propostas não mudam.
 * Uma vez por loteamento: se já existe área ligada (mesmo apagada), não faz nada.
 */
const ETAPA_DA_FASE: Record<string, string> = { prospeccao: "proposta", proposta: "proposta", parceria: "contrato", aprovacao: "contrato", obras: "contrato", vendas: "contrato" };

export async function loteamentosNoFunil(db: PrismaClient) {
  const ps = await db.project.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, municipio: true, uf: true, areaTotal: true, fase: true, proposals: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { ownerName: true } } },
  });
  for (const p of ps) {
    if (await db.area.findFirst({ where: { projectId: p.id }, select: { id: true } })) continue;
    await db.area.create({
      data: {
        nome: p.name, cidade: p.municipio, uf: p.uf, dono: p.proposals[0]?.ownerName?.trim() || null,
        hectares: p.areaTotal > 1 ? Math.round((p.areaTotal / 1e4) * 100) / 100 : null,
        etapa: ETAPA_DA_FASE[p.fase] ?? "proposta", projectId: p.id,
      },
    });
    console.log(`Projetos: loteamento ${p.name} no funil`);
  }
}

/**
 * Pedido do Fernando (20/11/2026): o raio-x de Sorocaba refeito no padrão de 17 seções (com Região e as 10
 * imagens) substitui o anterior no link. Roda enquanto o título gravado não for o do estudo novo.
 */
const TITULO_SOROCABA = "Estudo 1 · Viabilidade da área: Sorocaba/SP, 21,4 ha na Rod. Celso Charuri";

export async function sorocabaNoPadrao(db: PrismaClient) {
  const a = await db.area.findFirst({ where: { relatorio: "https://claude.ai/artifact/5Bt842BwwnapKvfYQ3zsRc", deletedAt: null }, select: { id: true, relatorioCompleto: true, estudo1: true } });
  if (!a || (a.relatorioCompleto as { titulo?: string } | null)?.titulo === TITULO_SOROCABA) return;
  const { readFileSync } = await import("node:fs");
  const { guardarRelatorio } = await import("../src/lib/relatorio-db");
  const r = await guardarRelatorio(db, a.id, readFileSync("prisma/dados/relatorios/sorocaba.html", "utf8"));
  const e1 = (a.estudo1 ?? {}) as Record<string, unknown>;
  await db.area.update({
    where: { id: a.id },
    data: {
      estudo1: {
        ...e1,
        aproveitavelPct: 48,
        regiao: { m2Min: 1075, m2Max: 1351, tipologia: "Condomínios de lotes de 250 a 345 m² e loteamento aberto em tramitação ao lado", expansao: "neutra (perímetro urbano; vetores principais são ZR3/ZR3-exp)", cidades: "Sorocaba 8 km (762 mil) · Votorantim 9 km · Mairinque 20 km · Itu 25 km · Salto 33 km" },
      },
    },
  });
  console.log(`Captação: raio-x de Sorocaba no padrão (${r.secoes} seções, ${r.imagens} imagens)`);
}

/**
 * Pedido do Fernando (20/11/2026): Estudo 2 (mercadológico) de Sorocaba, feito na conversa pela assinatura.
 * Preenche o formulário do mercadológico e guarda o estudo completo. Uma vez só (enquanto não houver mercado).
 */
export async function mercadoSorocaba(db: PrismaClient) {
  const a = await db.area.findFirst({ where: { relatorio: "https://claude.ai/artifact/5Bt842BwwnapKvfYQ3zsRc", deletedAt: null }, select: { id: true, relatorioMercado: true, estudo1: true } });
  if (!a || a.relatorioMercado) return;
  const estudo2 = {
    concorrentes: [
      { nome: "Villagio Itália (Alto da Boa Vista)", distancia: "1,8 km", tipo: "condomínio", lote: "250–320 m²", lancamento: "≈ R$ 1.000/m²", hoje: "R$ 1.115–1.400/m²", estagio: "ruas prontas, poucas casas", vendido: "a confirmar" },
      { nome: "Cond. Vista Verde (Brigadeiro Tobias)", distancia: "3,8 km", tipo: "condomínio", lote: "250–546 m²", lancamento: "≈ R$ 630/m²", hoje: "R$ 690–700/m²", estagio: "lazer pronto, lotes vazios", vendido: "a confirmar" },
      { nome: "Villa d'España (Jd. das Estrelas)", distancia: "4,0 km", tipo: "aberto", lote: "250 m²+", lancamento: "R$ 800/m²", hoje: "R$ 1.000/m² (1 anúncio)", estagio: "lançamento", vendido: "a confirmar" },
      { nome: "Condomínios do Alto da Boa Vista", distancia: "2,6 km", tipo: "condomínio", lote: "250–470 m²", lancamento: "—", hoje: "R$ 1.075–1.351/m²", estagio: "≈ 90% com casas", vendido: "—" },
    ],
    revenda: [
      { nome: "Villagio Itália", lotes: "vários", variacao: "+12% a +40%", tempo: "—", ocupacao: "poucas casas" },
      { nome: "Vista Verde", lotes: "vários (do loteador)", variacao: "+10%", tempo: "—", ocupacao: "lotes vazios" },
      { nome: "Villa d'España", lotes: "1 anúncio", variacao: "+25%", tempo: "—", ocupacao: "lançamento" },
    ],
    lacunas: "Loteamento aberto de 300 m² do lado do Alto da Boa Vista, com frente asfaltada; preço intermediário (R$ 750–900/m²) entre o popular e o condomínio; parcelamento direto num produto melhor que o popular; parque na APP.",
    produto: "Loteamento aberto de lotes de 300 m², R$ 750–900/m² (R$ 225–270 mil), parcelamento direto, parque linear na APP",
    financeiro: { vgv: "R$ 38–45 mi (aberto) · R$ 50–58 mi (condomínio)", infraPorLote: "no estudo de 30 dias", margem: "no estudo de 30 dias", parteDono: "no estudo de 30 dias", velocidade: "a confirmar com corretores" },
    veredito: "ajuste",
    risco: "Villa d'España (aberto, R$ 800/m², 96x) e o loteamento vizinho em aprovação podem chegar antes, com produto parecido e mais barato.",
  };
  const e1 = (a.estudo1 ?? {}) as Record<string, unknown>;
  await db.area.update({ where: { id: a.id }, data: { estudo2, estudo1: { ...e1, status: "sim" } } });
  const { readFileSync } = await import("node:fs");
  const { guardarRelatorio } = await import("../src/lib/relatorio-db");
  const r = await guardarRelatorio(db, a.id, readFileSync("prisma/dados/relatorios/sorocaba-mercado.html", "utf8"), [], "relatorioMercado");
  console.log(`Captação: Estudo 2 de Sorocaba (${r.secoes} seções, ${r.imagens} imagens)`);
}

/**
 * Pedido do Fernando (20/11/2026): o grupo "JBL Teste" (120363434373802289@g.us) passa a ser o JBL - Central.
 * Os outros grupos marcados como Central perdem a marca (continuam cadastrados). Uma vez só: se já é o Central, nada.
 */
export async function centralNoJblTeste(db: PrismaClient) {
  const jid = "120363434373802289@g.us";
  const g = await db.waGroup.findUnique({ where: { jid } });
  if (g?.funcao === "central" && g.papel !== "inativo") return;
  await db.waGroup.updateMany({ where: { funcao: "central", jid: { not: jid } }, data: { funcao: null } });
  await db.waGroup.upsert({ where: { jid }, create: { jid, name: "JBL Teste", papel: "controle", funcao: "central" }, update: { papel: "controle", funcao: "central" } });
  console.log("WhatsApp: JBL Teste agora é o JBL - Central");
}
