import { NextResponse } from "next/server";
import { withSession } from "@/lib/api";
import { MODO_COOKIE } from "@/lib/modo";

/** Troca entre o modo simples e o completo (só preferência de tela, guardada no navegador) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const modo = b.modo === "completo" ? "completo" : "simples";
    const r = NextResponse.json({ ok: true, modo });
    r.cookies.set(MODO_COOKIE, modo, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 365 * 864e2 });
    return r;
  });
}
