import type { AgendaConfig, Compromisso } from "@prisma/client";
import { db } from "./db";
import { newToken } from "./token";
import { enviarEmail, emailConfigurado } from "./email";
import { agendarSms, cancelarSms, MAX_AGENDA, smsConfigurado } from "./sms";
import { ocupadoNoGoogle } from "./google-agenda";
import { LINK_BASE } from "./site";
import { convite, dataExtenso, horaDe, HORARIOS_PADRAO, horariosValidos, slugDe, sobrepoe, telefoneE164, type Horarios, type Intervalo } from "./agenda";

/** Configuração da agenda da pessoa (criada na primeira vez, com segunda a sexta das 9h às 18h) */
export async function configDe(userId: string): Promise<AgendaConfig> {
  const c = await db.agendaConfig.findUnique({ where: { userId } });
  if (c) return c;
  const u = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
  const base = slugDe(u.name);
  let slug = base;
  for (let n = 2; await db.agendaConfig.findUnique({ where: { slug } }); n++) slug = `${base}-${n}`;
  return db.agendaConfig.create({ data: { userId, slug, horarios: HORARIOS_PADRAO } });
}

export const horariosDe = (c: AgendaConfig): Horarios => (horariosValidos(c.horarios) ? c.horarios : HORARIOS_PADRAO);

export const linkAgendar = (slug: string) => `${LINK_BASE}/agendar/${slug}`;
export const linkCancelar = (token: string) => `${LINK_BASE}/agendar/cancelar/${token}`;

/** Tudo o que ocupa a agenda entre `de` e `ate`: compromissos marcados e, se conectado, o Google Agenda */
export async function ocupado(c: AgendaConfig, de: Date, ate: Date): Promise<Intervalo[]> {
  const [meus, google] = await Promise.all([
    db.compromisso.findMany({ where: { userId: c.userId, status: "marcado", inicio: { lt: ate }, fim: { gt: de } }, select: { inicio: true, fim: true } }),
    c.googleRefresh ? ocupadoNoGoogle(c.googleRefresh, de, ate) : Promise.resolve([]),
  ]);
  return [...meus, ...google];
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

function emailHtml(o: { titulo: string; linhas: [string, string][]; texto: string; botao?: { href: string; rotulo: string } }) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#122A45">
  <div style="border-top:4px solid #C1943D;padding:24px 4px">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#A2782F;font-weight:bold">JBL Incorporadora</div>
    <h2 style="font-family:Georgia,serif;font-weight:normal;margin:8px 0 16px">${esc(o.titulo)}</h2>
    <p style="font-size:15px;line-height:1.5">${o.texto}</p>
    <table style="font-size:15px;margin:16px 0;border-collapse:collapse">${o.linhas
      .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#697683">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`)
      .join("")}</table>
    ${o.botao ? `<p style="font-size:13px;color:#697683">Não vai conseguir? <a href="${o.botao.href}" style="color:#A2782F">${esc(o.botao.rotulo)}</a></p>` : ""}
  </div></div>`;
}

type ComDono = Compromisso & { user: { name: string; email: string } };

/** E-mail ao convidado com o convite (.ics) anexado */
async function avisarPorEmail(c: ComDono, cancelado = false) {
  if (!c.convidadoEmail) return null;
  if (!emailConfigurado()) return "E-mail não configurado (RESEND_API_KEY e EMAIL_FROM)";
  const ics = convite({
    id: c.id, titulo: c.titulo, descricao: c.descricao, local: c.local, inicio: c.inicio, fim: c.fim,
    organizador: { nome: c.user.name, email: c.user.email },
    convidado: { nome: c.convidadoNome ?? c.convidadoEmail, email: c.convidadoEmail },
    cancelado,
  });
  const linhas: [string, string][] = [["Quando", dataExtenso(c.inicio)], ["Duração", `${Math.round((c.fim.getTime() - c.inicio.getTime()) / 60e3)} minutos`], ["Com", c.user.name]];
  if (c.local) linhas.push(["Local", c.local]);
  try {
    await enviarEmail(
      c.convidadoEmail,
      cancelado ? `Cancelada: ${c.titulo}` : `Reunião marcada: ${c.titulo} · ${dataExtenso(c.inicio)}`,
      emailHtml({
        titulo: cancelado ? "Reunião cancelada" : "Reunião marcada",
        texto: `Olá${c.convidadoNome ? `, ${esc(c.convidadoNome.split(" ")[0])}` : ""}! ${cancelado ? "A reunião abaixo foi cancelada." : "Sua reunião com a JBL está confirmada. O convite segue anexo para adicionar à sua agenda; uma hora antes você recebe um SMS de lembrete."}`,
        linhas,
        botao: cancelado ? undefined : { href: linkCancelar(c.cancelToken), rotulo: "Cancelar a reunião" },
      }),
      [{ filename: "convite.ics", content: Buffer.from(ics).toString("base64"), content_type: `text/calendar; method=${cancelado ? "CANCEL" : "REQUEST"}` }],
    );
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

/** Agenda o SMS de lembrete para 1 hora antes. Devolve [id, erro] */
async function lembreteSms(c: ComDono): Promise<[string | null, string | null]> {
  const para = telefoneE164(c.convidadoTel);
  if (!c.convidadoTel) return [null, null];
  if (!para) return [null, "Telefone inválido para SMS"];
  if (!smsConfigurado()) return [null, "SMS não configurado (Twilio)"];
  const enviarEm = new Date(c.inicio.getTime() - 3600e3);
  if (c.inicio.getTime() <= Date.now()) return [null, null];
  const texto = `JBL: lembrete da sua reunião "${c.titulo}" com ${c.user.name} hoje às ${horaDe(c.inicio)}.${c.local ? ` Local: ${c.local}.` : ""}`;
  try {
    return [await agendarSms(para, texto, enviarEm.getTime() < Date.now() ? new Date() : enviarEm), null];
  } catch (e) {
    return [null, (e as Error).message];
  }
}

export type NovoCompromisso = {
  tipo: "pessoal" | "reuniao";
  titulo: string;
  descricao?: string | null;
  local?: string | null;
  inicio: Date;
  fim: Date;
  convidadoNome?: string | null;
  convidadoEmail?: string | null;
  convidadoTel?: string | null;
  origem?: "interno" | "link";
};

/** Cria o compromisso; reunião com convidado: e-mail com o convite e SMS 1 hora antes */
export async function criarCompromisso(userId: string, n: NovoCompromisso) {
  const reuniao = n.tipo === "reuniao";
  const c = await db.compromisso.create({
    data: {
      userId, tipo: n.tipo, titulo: n.titulo, descricao: n.descricao || null, local: n.local || null, inicio: n.inicio, fim: n.fim,
      convidadoNome: reuniao ? n.convidadoNome || null : null,
      convidadoEmail: reuniao ? n.convidadoEmail || null : null,
      convidadoTel: reuniao ? n.convidadoTel || null : null,
      origem: n.origem ?? "interno",
      cancelToken: newToken(),
    },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!reuniao) return c;
  const [emailErro, [smsId, smsErro]] = await Promise.all([avisarPorEmail(c), lembreteSms(c)]);
  return db.compromisso.update({ where: { id: c.id }, data: { emailErro, smsId, smsErro }, include: { user: { select: { name: true, email: true } } } });
}

/** Cancela: tira da agenda, cancela o SMS agendado e avisa o convidado */
export async function cancelarCompromisso(id: string) {
  const c = await db.compromisso.update({ where: { id }, data: { status: "cancelado" }, include: { user: { select: { name: true, email: true } } } });
  if (c.smsId) await cancelarSms(c.smsId);
  if (c.inicio.getTime() > Date.now()) await avisarPorEmail(c, true);
  return c;
}

/** Conflito com outro compromisso marcado (o próprio fica de fora) */
export async function conflito(userId: string, inicio: Date, fim: Date, exceto?: string) {
  const outros = await db.compromisso.findMany({ where: { userId, status: "marcado", inicio: { lt: fim }, fim: { gt: inicio }, ...(exceto ? { id: { not: exceto } } : {}) }, select: { titulo: true, inicio: true, fim: true } });
  return outros.find((o) => sobrepoe(o, { inicio, fim })) ?? null;
}

/**
 * Rotina diária: agenda os SMS de lembrete que ainda estavam longe demais (mais de 35 dias)
 * quando a reunião foi marcada.
 */
export async function agendarLembretesPendentes() {
  const agora = Date.now();
  const lista = await db.compromisso.findMany({
    where: { status: "marcado", tipo: "reuniao", smsId: null, smsErro: null, convidadoTel: { not: null }, inicio: { gt: new Date(agora + 3600e3), lt: new Date(agora + MAX_AGENDA) } },
    include: { user: { select: { name: true, email: true } } },
  });
  for (const c of lista) {
    const [smsId, smsErro] = await lembreteSms(c);
    await db.compromisso.update({ where: { id: c.id }, data: { smsId, smsErro } });
  }
  return lista.length;
}
