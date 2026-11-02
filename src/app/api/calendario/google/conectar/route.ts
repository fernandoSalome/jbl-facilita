import { NextResponse } from "next/server";
import { json, withSession } from "@/lib/api";
import { googleConfigurado, linkDeConexao } from "@/lib/google-agenda";

/** Vai para o Google autorizar a leitura dos horários ocupados */
export async function GET() {
  return withSession(async (s) => {
    if (!googleConfigurado()) return json({ error: "Google Agenda não configurado (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET)" }, 400);
    return NextResponse.redirect(await linkDeConexao(s.sub));
  });
}
