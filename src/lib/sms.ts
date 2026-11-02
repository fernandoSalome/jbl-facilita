/**
 * SMS pelo Twilio (https://www.twilio.com). Variáveis: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e
 * TWILIO_MESSAGING_SERVICE_SID (o serviço de mensagens com o número que envia). O lembrete fica
 * agendado no próprio Twilio para a hora certa: não depende do servidor estar no ar.
 * O Twilio agenda de 15 minutos a 35 dias à frente; mais perto, envia na hora; mais longe, a rotina
 * diária (/api/cron/agenda) agenda quando entrar no prazo.
 */
export const smsConfigurado = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_MESSAGING_SERVICE_SID);

const MIN_AGENDA = 15 * 60e3;
export const MAX_AGENDA = 35 * 864e5 - 3600e3;

async function twilio(caminho: string, campos: Record<string, string>) {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/${caminho}`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(campos),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`SMS não enviado (${r.status}): ${String(j.message ?? "").slice(0, 200)}`);
  return j as { sid: string };
}

/**
 * Envia `texto` para `para` (+55...) em `enviarEm`. Devolve o id da mensagem, ou null quando
 * ainda está longe demais para agendar (a rotina diária agenda depois).
 */
export async function agendarSms(para: string, texto: string, enviarEm: Date): Promise<string | null> {
  if (!smsConfigurado()) throw new Error("Envio de SMS não configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_MESSAGING_SERVICE_SID).");
  const falta = enviarEm.getTime() - Date.now();
  if (falta > MAX_AGENDA) return null;
  const base = { To: para, Body: texto, MessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID! };
  const m = await twilio("Messages.json", falta < MIN_AGENDA ? base : { ...base, ScheduleType: "fixed", SendAt: enviarEm.toISOString() });
  return m.sid;
}

/** Cancela um SMS agendado (já enviado: não faz nada) */
export async function cancelarSms(id: string) {
  if (!smsConfigurado()) return;
  await twilio(`Messages/${id}.json`, { Status: "canceled" }).catch(() => {});
}
