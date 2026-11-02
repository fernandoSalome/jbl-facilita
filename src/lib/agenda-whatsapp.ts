import type { Compromisso } from "@prisma/client";
import { db } from "./db";
import { dataExtenso, horaDe } from "./agenda";
import { enviarTexto } from "./whatsapp";

/**
 * Avisos do calendário no grupo de WhatsApp de monitoramento (cadastrado na tela "Assistente WhatsApp",
 * com "monitoring" no nome). Saem mesmo sem e-mail e SMS configurados:
 *  - reunião marcada e reunião cancelada, na hora;
 *  - lembrete 1 dia antes e 1 hora antes ("falta X para a reunião com Y"), pela rotina /api/cron/whatsapp-agenda.
 * Cada aviso sai uma vez só (a data de envio fica no compromisso).
 */

const ROBO = "🤖";
type ComDono = Compromisso & { user: { name: string } };

export const whatsappConfigurado = () => !!(process.env.EVOLUTION_URL && process.env.EVOLUTION_KEY && process.env.EVOLUTION_INSTANCE);

/** Grupo de monitoramento: o cadastrado com "monitoring" (ou "monitoramento") no nome */
export async function grupoMonitoring() {
  const gs = await db.waGroup.findMany({ where: { papel: { not: "inativo" } }, select: { jid: true, name: true } });
  return gs.find((g) => /monitor(ing|amento)/i.test(g.name)) ?? null;
}

/** "1 dia", "2 horas", "1 hora e 5 minutos", "45 minutos" */
export function falta(ms: number) {
  const min = Math.max(1, Math.round(ms / 60e3));
  if (min >= 23 * 60) {
    const d = Math.round(min / 1440);
    return `${d} ${d === 1 ? "dia" : "dias"}`;
  }
  const h = Math.floor(min / 60), m = min % 60;
  const hs = h ? `${h} ${h === 1 ? "hora" : "horas"}` : "";
  const ms_ = m ? `${m} ${m === 1 ? "minuto" : "minutos"}` : "";
  return [hs, ms_].filter(Boolean).join(" e ");
}

const com = (c: ComDono) => (c.convidadoNome ? ` com ${c.convidadoNome}` : "");
const detalhes = (c: ComDono) =>
  [
    `🗓️ ${dataExtenso(c.inicio)} (${Math.round((c.fim.getTime() - c.inicio.getTime()) / 60e3)} min)`,
    `👤 Agenda de ${c.user.name}`,
    c.convidadoTel ? `📞 ${c.convidadoTel}` : "",
    c.convidadoEmail ? `✉️ ${c.convidadoEmail}` : "",
    c.local ? `📍 ${c.local}` : "",
  ].filter(Boolean).join("\n");

export function textoMarcado(c: ComDono) {
  return `${ROBO} *Reunião marcada*${c.origem === "link" ? " pelo link de agendamento" : ""}: ${c.titulo}${com(c)}\n${detalhes(c)}`;
}
export function textoCancelado(c: ComDono) {
  return `${ROBO} *Reunião cancelada*: ${c.titulo}${com(c)}\n🗓️ era ${dataExtenso(c.inicio)}`;
}
export function textoLembrete(c: ComDono, agora: number) {
  return `${ROBO} ⏰ *Falta ${falta(c.inicio.getTime() - agora)}* para a reunião ${c.titulo}${com(c)}, às ${horaDe(c.inicio)}\n${detalhes(c)}`;
}

async function enviar(texto: string): Promise<string | null> {
  if (!whatsappConfigurado()) return "WhatsApp não configurado (Evolution)";
  const g = await grupoMonitoring();
  if (!g) return "Grupo de monitoramento não cadastrado (Assistente WhatsApp, com \"monitoring\" no nome)";
  try {
    await enviarTexto(g.jid, texto);
    return null;
  } catch (e) {
    return (e as Error).message.slice(0, 300);
  }
}

/** Aviso de reunião marcada. Devolve o que gravar no compromisso */
export async function avisarMarcadoWhatsapp(c: ComDono) {
  const erro = await enviar(textoMarcado(c));
  return erro ? { waErro: erro } : { waMarcadoEm: new Date(), waErro: null };
}

export async function avisarCanceladoWhatsapp(c: ComDono) {
  return enviar(textoCancelado(c));
}

/**
 * Rotina (a cada ~10 minutos): lembretes de 1 dia e de 1 hora antes. Reunião marcada em cima da hora não
 * recebe o lembrete de 1 dia (o aviso de marcada já saiu). Devolve quantos avisos saíram.
 */
export async function lembretesWhatsapp(agora = Date.now()) {
  const DIA = 24 * 3600e3, HORA = 3600e3;
  const lista = await db.compromisso.findMany({
    where: { status: "marcado", tipo: "reuniao", inicio: { gt: new Date(agora), lte: new Date(agora + DIA) }, OR: [{ waDiaEm: null }, { waHoraEm: null }] },
    include: { user: { select: { name: true } } },
  });
  let n = 0;
  for (const c of lista) {
    const resta = c.inicio.getTime() - agora;
    if (!c.waHoraEm && resta <= HORA) {
      // o de 1 hora substitui o de 1 dia, se os dois ficaram para agora
      const erro = await enviar(textoLembrete(c, agora));
      await db.compromisso.update({ where: { id: c.id }, data: erro ? { waErro: erro } : { waHoraEm: new Date(), waDiaEm: c.waDiaEm ?? new Date(), waErro: null } });
      if (!erro) n++;
    } else if (!c.waDiaEm && resta > HORA) {
      if (c.createdAt.getTime() > c.inicio.getTime() - DIA) {
        await db.compromisso.update({ where: { id: c.id }, data: { waDiaEm: new Date() } }); // marcada a menos de 1 dia: sem lembrete de véspera
        continue;
      }
      const erro = await enviar(textoLembrete(c, agora));
      await db.compromisso.update({ where: { id: c.id }, data: erro ? { waErro: erro } : { waDiaEm: new Date(), waErro: null } });
      if (!erro) n++;
    }
  }
  return n;
}
