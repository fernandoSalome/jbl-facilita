import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { configDe } from "@/lib/agenda-server";
import { quemConectou, trocarCodigo } from "@/lib/google-agenda";

/** Volta do Google: guarda a conexão e retorna para o calendário */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const volta = (q: string) => NextResponse.redirect(new URL(`/app/calendario?google=${q}`, req.url));
  const s = await getSession();
  const userId = await quemConectou(u.searchParams.get("state") ?? "");
  const code = u.searchParams.get("code");
  if (!s || !userId || userId !== s.sub || !code) return volta("erro");
  try {
    const { refresh, email } = await trocarCodigo(code);
    if (!refresh) return volta("erro");
    const c = await configDe(userId);
    await db.agendaConfig.update({ where: { id: c.id }, data: { googleRefresh: refresh, googleEmail: email } });
    return volta("ok");
  } catch (e) {
    console.error("google callback", e);
    return volta("erro");
  }
}
