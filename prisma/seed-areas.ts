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
