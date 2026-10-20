import { DEFAULT_INPUTS, type StudyInputs } from "./calc";

export type ProposalOptions = {
  /** Mostra o formulário de carta de intenção no fim da proposta */
  cartaIntencao: boolean;
  validadeDias: number;
  /** Proposta sem prazo: o link não expira */
  semValidade?: boolean;
  corretorNome?: string;
  corretorTelefone?: string;
  /** Para quem a proposta fala: muda saudação e textos ("a família", "o proprietário", "você") */
  destinatario?: Destinatario;
  /** Data escrita na proposta. Sem isto (propostas antigas): a do envio, ou a da criação */
  data?: DataProposta;
};

/**
 * auto    = o dia em que a pessoa abre a proposta
 * criacao = fixa no dia em que a proposta foi criada
 * fixa    = um dia escolhido (dia = "AAAA-MM-DD")
 */
export type DataProposta = { modo: "auto" | "criacao" | "fixa"; dia?: string };

/** Data que aparece na proposta (assinatura dos profissionais, carta, validade...) */
export function dataDaProposta(p: { createdAt: Date | string; publishedAt?: Date | string | null; options: ProposalOptions }, agora = new Date()): Date {
  const d = p.options.data;
  if (d?.modo === "auto") return agora;
  if (d?.modo === "fixa" && d.dia && /^\d{4}-\d{2}-\d{2}$/.test(d.dia)) return new Date(`${d.dia}T12:00:00-03:00`);
  if (d?.modo === "criacao") return new Date(p.createdAt);
  return new Date(p.publishedAt ?? p.createdAt);
}

export type Destinatario = { tipo: "familia" | "proprietario" | "pessoa"; nome?: string; genero?: "m" | "f" };

export const DEFAULT_OPTIONS: ProposalOptions = { cartaIntencao: true, validadeDias: 15 };

/** Alterações feitas à mão na proposta: textos (txt./v./t./form.), links, botões, imagens, seções e cores do tema */
export type Overrides = Record<string, unknown>;

export const STATUS: Record<string, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "bg-slate-100 text-slate-600 ring-slate-200" },
  enviada: { label: "Enviada", tone: "bg-navy-50 text-navy ring-navy/15" },
  aberta: { label: "Aberta", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  carta_recebida: { label: "Carta recebida", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  negociacao: { label: "Em negociação", tone: "bg-gold-soft text-gold-ink ring-gold-line" },
  aceita: { label: "Aceita", tone: "bg-emerald-600 text-white ring-emerald-600" },
  recusada: { label: "Recusada", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  expirada: { label: "Expirada", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
};

/** Status exibido: enviada/aberta viram "expirada" depois da validade. */
export function displayStatus(p: { status: string; expiresAt: Date | null }) {
  if ((p.status === "enviada" || p.status === "aberta") && p.expiresAt && p.expiresAt < new Date()) return "expirada";
  return p.status;
}

export function parseInputs(json: unknown): StudyInputs {
  const i: StudyInputs = { ...DEFAULT_INPUTS, ...((json as Partial<StudyInputs>) ?? {}) };
  // Antes da opção de desmembramento, a primeira etapa era só o número de lotes:
  // vira a área equivalente (lotes × lote ÷ aproveitamento), com os mesmos números
  if (i.lotesEtapa1 && !i.primeiraEtapa && !i.areaEtapa1 && i.aproveitamento > 0) {
    return { ...i, primeiraEtapa: true, areaEtapa1: (i.lotesEtapa1 * i.metragemLote) / i.aproveitamento, loteEtapa1: i.metragemLote, lotesEtapa1: null };
  }
  return i;
}

export function parseOptions(json: unknown): ProposalOptions {
  return { ...DEFAULT_OPTIONS, ...((json as Partial<ProposalOptions>) ?? {}) };
}

export function parseOverrides(json: unknown): Overrides {
  return (json as Overrides) ?? {};
}

/** Robôs que abrem o link para gerar prévia (WhatsApp, Facebook...) não contam como abertura. */
export function isPreviewBot(ua: string | null) {
  return !ua || /whatsapp|facebookexternalhit|telegrambot|slackbot|twitterbot|discordbot|linkedinbot|bot|crawler|spider|preview|headless/i.test(ua);
}
