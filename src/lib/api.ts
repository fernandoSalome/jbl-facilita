import { NextResponse } from "next/server";
import { getSession } from "./auth";
import type { Session } from "./session";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Executa o handler só com usuário logado (e admin, se pedido). */
export async function withSession(fn: (s: Session) => Promise<Response>, opts: { admin?: boolean } = {}) {
  const s = await getSession();
  if (!s) return json({ error: "Não autenticado" }, 401);
  if (opts.admin && s.role !== "ADMIN") return json({ error: "Apenas administradores" }, 403);
  return fn(s);
}
