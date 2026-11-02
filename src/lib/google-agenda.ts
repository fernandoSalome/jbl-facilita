import { SignJWT, jwtVerify } from "jose";
import { LINK_BASE } from "./site";
import type { Intervalo } from "./agenda";

/**
 * Google Agenda: só lê os horários ocupados (free/busy) para tirar esses horários do link de
 * agendamento. Variáveis: GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (Google Cloud → APIs e serviços →
 * Credenciais → ID do cliente OAuth "Aplicativo da Web", com a URL de redirecionamento
 * <site>/api/calendario/google/callback e a Google Calendar API ativada).
 */
export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const ESCOPOS = ["openid", "email", "https://www.googleapis.com/auth/calendar.freebusy"];
export const redirectUri = () => `${(process.env.GOOGLE_REDIRECT_BASE || LINK_BASE).replace(/\/+$/, "")}/api/calendario/google/callback`;

const segredo = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-jbl-facilita");

/** Link para a pessoa autorizar; o state leva quem está conectando (assinado, vale 10 minutos) */
export async function linkDeConexao(userId: string) {
  const state = await new SignJWT({ u: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("10m").sign(segredo());
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export async function quemConectou(state: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(state, segredo());
    return typeof payload.u === "string" ? payload.u : null;
  } catch {
    return null;
  }
}

async function token(campos: Record<string, string>) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...campos }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Google: ${j.error_description ?? j.error ?? r.status}`);
  return j as { access_token: string; refresh_token?: string; id_token?: string };
}

/** Troca o código da autorização pelo refresh token e o e-mail da conta */
export async function trocarCodigo(code: string) {
  const t = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  let email: string | null = null;
  if (t.id_token) {
    try {
      email = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString()).email ?? null;
    } catch {}
  }
  return { refresh: t.refresh_token ?? null, email };
}

/** Horários ocupados na agenda principal do Google entre `de` e `ate`. Falhou: lista vazia (o link continua funcionando) */
export async function ocupadoNoGoogle(refresh: string, de: Date, ate: Date): Promise<Intervalo[]> {
  if (!googleConfigurado()) return [];
  try {
    const { access_token } = await token({ refresh_token: refresh, grant_type: "refresh_token" });
    const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ timeMin: de.toISOString(), timeMax: ate.toISOString(), items: [{ id: "primary" }] }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const busy: { start: string; end: string }[] = j.calendars?.primary?.busy ?? [];
    return busy.map((b) => ({ inicio: new Date(b.start), fim: new Date(b.end) }));
  } catch (e) {
    console.error("google freebusy", e);
    return [];
  }
}
