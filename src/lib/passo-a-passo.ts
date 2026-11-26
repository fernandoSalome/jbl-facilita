/**
 * Passo a passo da parceria para o proprietário (pedido 25/11/2026): a equipe marca à mão cada passo como
 * realizado e o proprietário acompanha por um link público (/andamento/<token>). Os textos são os do Marcelo;
 * {O}, {ao} e {nome} viram o tratamento da pessoa ("O Sr. Rogério", "ao Sr. Rogério"), editável na tela.
 */

export type PassoPadrao = { id: string; numero: string; titulo: string; texto: string };

export const PASSOS: PassoPadrao[] = [
  {
    id: "estudo-preliminar", numero: "01", titulo: "Estudo preliminar da área",
    texto: "Análise da documentação do imóvel, das características da área, da demanda de mercado e da viabilidade econômica preliminar do empreendimento.",
  },
  {
    id: "carta-spe", numero: "02", titulo: "Carta de Intenção e análise da SPE",
    texto: [
      "{O} {nome} enviará a Carta de Intenção por meio da página da proposta, formalizando seu interesse na continuidade dos estudos e na elaboração do projeto.",
      "A partir dessa manifestação, será realizado o estudo de massa da área, com prazo estimado de 30 dias, para aprofundamento da análise de viabilidade.",
      "A Carta de Intenção não constitui contrato de parceria, tampouco implica a constituição de uma Sociedade de Propósito Específico (SPE).",
      "Concomitantemente será encaminhada a minuta do contrato da SPE para análise e avaliação jurídica.",
    ].join("\n\n"),
  },
  {
    id: "formalizacao", numero: "03", titulo: "Formalização da parceria",
    texto: "Após a confirmação da viabilidade do empreendimento por meio do estudo de massa, serão formalizadas as condições da parceria, definindo a participação de cada parte, a estrutura societária, as responsabilidades, as regras de governança e as condições de integralização do imóvel à SPE.",
  },
  {
    id: "aprovacoes-1", numero: "04", titulo: "Condução das aprovações | Primeira etapa",
    texto: "Elaboração dos projetos técnicos, encaminhamento dos processos administrativos e atendimento às exigências dos órgãos competentes, visando à obtenção das aprovações e autorizações necessárias à primeira etapa do empreendimento.",
  },
  {
    id: "comercializacao-1", numero: "05", titulo: "Comercialização dos lotes | Primeira etapa",
    texto: "Estruturação da operação comercial, contemplando estratégias de marketing, equipe de corretores, contratos de venda e gestão dos pagamentos dos compradores, respeitando os requisitos legais e registrais aplicáveis à comercialização.",
  },
  {
    id: "aprovacoes-2", numero: "06", titulo: "Condução das aprovações | Segunda etapa",
    texto: "Continuidade dos processos de aprovação, elaboração dos projetos complementares e atendimento às exigências dos órgãos competentes, visando à obtenção das licenças e autorizações necessárias à execução da segunda etapa do empreendimento.",
  },
  {
    id: "obras-2", numero: "07", titulo: "Execução das obras de infraestrutura | Segunda etapa",
    texto: [
      "Início das obras de infraestrutura após o cumprimento das condições comerciais, técnicas e legais previstas na parceria.",
      "O andamento das obras será acompanhado de forma transparente, com a apresentação quinzenal de relatórios, registros fotográficos e vídeos, permitindo {ao} {nome} acompanhar a evolução do empreendimento.",
    ].join("\n\n"),
  },
  {
    id: "gestao-2", numero: "08", titulo: "Gestão administrativa, financeira e repasses | Segunda etapa",
    texto: "Gestão da carteira de recebíveis, acompanhamento dos pagamentos dos compradores, prestação de contas e realização dos repasses financeiros {ao} {nome}, conforme os percentuais, prazos e condições estabelecidos no contrato de parceria.",
  },
];

const IDS = new Set(PASSOS.map((p) => p.id));
const LIMITE_TEXTO = 2500;
const LIMITE_NOTA = 300;
const LIMITE_TRATAMENTO = 60;

/**
 * O que a equipe grava por passo: realizado, a data (só se a equipe puser: pedido 25/11/2026), texto trocado e uma
 * nota curta para o proprietário. Marca antiga só com a data também conta como realizado.
 */
export type MarcaPasso = { feito?: boolean; feitoEm?: string; texto?: string; nota?: string };
export type Andamento = { tratamento?: string; passos: Record<string, MarcaPasso>; atualizadoEm?: string };

export type Situacao = "feito" | "proximo" | "depois";
export type PassoMostrado = PassoPadrao & { situacao: Situacao; feitoEm?: string; nota?: string; textoPadrao: boolean };

const dataValida = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const texto = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\r\n/g, "\n").trim().slice(0, max) : "");

/** Lê o que está gravado na área (ou o que chegou na API), descartando o que não for de um passo conhecido */
export function lerAndamento(v: unknown): Andamento {
  const o = v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const brutos = o.passos && typeof o.passos === "object" && !Array.isArray(o.passos) ? (o.passos as Record<string, unknown>) : {};
  const passos: Record<string, MarcaPasso> = {};
  for (const [id, m] of Object.entries(brutos)) {
    if (!IDS.has(id) || !m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    const marca: MarcaPasso = {};
    if (r.feito === true || dataValida(r.feitoEm)) marca.feito = true;
    if (dataValida(r.feitoEm)) marca.feitoEm = r.feitoEm;
    const t = texto(r.texto, LIMITE_TEXTO);
    if (t) marca.texto = t;
    const n = texto(r.nota, LIMITE_NOTA);
    if (n) marca.nota = n;
    if (Object.keys(marca).length) passos[id] = marca;
  }
  const tratamento = texto(o.tratamento, LIMITE_TRATAMENTO);
  return { ...(tratamento ? { tratamento } : {}), passos, ...(typeof o.atualizadoEm === "string" ? { atualizadoEm: o.atualizadoEm } : {}) };
}

/** "Rogério da Silva" → "Sr. Rogério"; sem nome, "proprietário" */
export function tratamentoPadrao(dono: string | null | undefined): string {
  const primeiro = (dono ?? "").trim().split(/\s+/)[0];
  return primeiro ? `Sr. ${primeiro}` : "proprietário";
}

/** Troca {O}, {ao} e {nome} pelo tratamento, no feminino quando começa com Sra./Dona */
export function aplicarTratamento(t: string, tratamento: string): string {
  const fem = /^(sra\.?|senhora|dona|dra\.?)\s/i.test(tratamento);
  return t.replace(/\{O\}/g, fem ? "A" : "O").replace(/\{ao\}/g, fem ? "à" : "ao").replace(/\{nome\}/g, tratamento);
}

/** Os passos como aparecem: realizados, o próximo (o primeiro em aberto) e os que vêm depois */
export function montarPassos(a: Andamento, dono: string | null | undefined): PassoMostrado[] {
  const trat = a.tratamento || tratamentoPadrao(dono);
  let achouProximo = false;
  return PASSOS.map((p) => {
    const m = a.passos[p.id] ?? {};
    let situacao: Situacao = "feito";
    if (!m.feito) {
      situacao = achouProximo ? "depois" : "proximo";
      achouProximo = true;
    }
    return { ...p, texto: aplicarTratamento(m.texto ?? p.texto, trat), textoPadrao: !m.texto, situacao, feitoEm: m.feitoEm, nota: m.nota };
  });
}

/** 3 de 8 realizados → { feitos: 3, total: 8, pct: 38 } */
export function progressoPassos(passos: PassoMostrado[]) {
  const feitos = passos.filter((p) => p.situacao === "feito").length;
  return { feitos, total: passos.length, pct: Math.round((feitos / passos.length) * 100) };
}

/** "2026-11-25" → "25 de novembro de 2026" */
export function dataPorExtenso(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}
