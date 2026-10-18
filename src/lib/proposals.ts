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
};

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
  return { ...DEFAULT_INPUTS, ...((json as Partial<StudyInputs>) ?? {}) };
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
