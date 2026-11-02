/**
 * Calendário (parecido com o Calendly). Funções puras: horários livres de um dia, conflitos
 * e o convite .ics. Tudo na hora de São Paulo (−03:00, sem horário de verão desde 2019).
 */

export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** Horários de trabalho por dia da semana (0 = domingo): [["09:00","12:00"], ...] */
export type Horarios = Record<string, [string, string][]>;

export const HORARIOS_PADRAO: Horarios = {
  "0": [],
  "1": [["09:00", "18:00"]],
  "2": [["09:00", "18:00"]],
  "3": [["09:00", "18:00"]],
  "4": [["09:00", "18:00"]],
  "5": [["09:00", "18:00"]],
  "6": [],
};

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export type Intervalo = { inicio: Date; fim: Date };

/** "2026-11-03" + "09:30" → Date (hora de São Paulo) */
export const quando = (dia: string, hora: string) => new Date(`${dia}T${hora}:00${OFFSET}`);

/** Dia da semana (0 = domingo) de "AAAA-MM-DD" */
export const diaDaSemana = (dia: string) => new Date(`${dia}T12:00:00${OFFSET}`).getUTCDay();

/** Data → "AAAA-MM-DD" na hora de São Paulo */
export const diaDe = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: FUSO });

/** Data → "09:30" na hora de São Paulo */
export const horaDe = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

/** "terça-feira, 3 de novembro de 2026 às 09:30" */
export const dataExtenso = (d: Date) =>
  `${d.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long", year: "numeric" })} às ${horaDe(d)}`;

export const sobrepoe = (a: Intervalo, b: Intervalo) => a.inicio < b.fim && b.inicio < a.fim;

/** Horários válidos: "HH:MM" e início antes do fim */
export function horariosValidos(h: unknown): h is Horarios {
  if (!h || typeof h !== "object") return false;
  return Object.entries(h as Record<string, unknown>).every(
    ([k, v]) => /^[0-6]$/.test(k) && Array.isArray(v) && v.every((x) => Array.isArray(x) && x.length === 2 && x.every((t) => typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) && x[0] < x[1]),
  );
}

/**
 * Horários livres de um dia: dentro dos horários de trabalho, de `duracao` em `duracao` minutos,
 * sem bater com nada ocupado (compromissos e Google Agenda) e respeitando a antecedência mínima.
 */
export function horariosLivres(o: {
  dia: string;
  horarios: Horarios;
  duracaoMin: number;
  ocupado: Intervalo[];
  agora?: Date;
  antecedenciaH?: number;
}): Date[] {
  const { dia, horarios, duracaoMin, ocupado } = o;
  if (!(duracaoMin > 0)) return [];
  const limite = new Date((o.agora ?? new Date()).getTime() + (o.antecedenciaH ?? 0) * 3600e3);
  const passo = duracaoMin * 60e3;
  const livres: Date[] = [];
  for (const [de, ate] of horarios[String(diaDaSemana(dia))] ?? []) {
    const fimFaixa = quando(dia, ate).getTime();
    for (let t = quando(dia, de).getTime(); t + passo <= fimFaixa; t += passo) {
      const slot = { inicio: new Date(t), fim: new Date(t + passo) };
      if (slot.inicio < limite) continue;
      if (ocupado.some((b) => sobrepoe(slot, b))) continue;
      livres.push(slot.inicio);
    }
  }
  return livres;
}

/** Celular brasileiro para SMS no formato internacional: (11) 99999-9999 → +5511999999999. null = inválido */
export function telefoneE164(tel: string | null | undefined): string | null {
  const d = (tel ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return null;
  const n = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
  return n.length === 12 || n.length === 13 ? `+${n}` : null;
}

const icsData = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsTexto = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Convite .ics (abre no Google Agenda, Outlook e no celular) */
export function convite(c: { id: string; titulo: string; descricao?: string | null; local?: string | null; inicio: Date; fim: Date; organizador: { nome: string; email: string }; convidado?: { nome: string; email: string } | null; cancelado?: boolean }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JBL Facilita//Calendario//PT",
    `METHOD:${c.cancelado ? "CANCEL" : "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${c.id}@jbl-facilita`,
    `DTSTAMP:${icsData(new Date())}`,
    `DTSTART:${icsData(c.inicio)}`,
    `DTEND:${icsData(c.fim)}`,
    `SUMMARY:${icsTexto(c.titulo)}`,
    ...(c.descricao ? [`DESCRIPTION:${icsTexto(c.descricao)}`] : []),
    ...(c.local ? [`LOCATION:${icsTexto(c.local)}`] : []),
    `ORGANIZER;CN=${icsTexto(c.organizador.nome)}:mailto:${c.organizador.email}`,
    ...(c.convidado ? [`ATTENDEE;CN=${icsTexto(c.convidado.nome)};RSVP=TRUE:mailto:${c.convidado.email}`] : []),
    `STATUS:${c.cancelado ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsTexto(c.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Link público a partir do nome: "Marcelo Silva" → "marcelo-silva" */
export const slugDe = (nome: string) =>
  nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "agenda";
