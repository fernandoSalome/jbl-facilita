import { json } from "@/lib/api";
import { agendarLembretesPendentes } from "@/lib/agenda-server";

/** Rotina diária da Vercel (vercel.json): agenda os SMS de lembrete que estavam a mais de 35 dias */
export async function GET(req: Request) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return json({ error: "Não autorizado" }, 401);
  return json({ agendados: await agendarLembretesPendentes() });
}
