"use server";

import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";

/** Senhas erradas seguidas (mesmo e-mail e IP) até ter de esperar, e quanto tempo */
const LIMITE_FALHAS = 8;
const ESPERA_MS = 15 * 60e3;
/** Hash de uma senha aleatória: e-mail que não existe leva o mesmo tempo para responder (não revela quem tem conta) */
const HASH_FALSO = "$2a$10$GT6dkdkqlgERPvZO3dPv3uWq5UVgdvJ70OXLCjoxvaf6lubth9o3y";

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const ip = (headers().get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  const chave = `${email}|${ip}`;

  const t = await db.loginTentativa.findUnique({ where: { chave } });
  const dentroDaEspera = t && Date.now() - t.desde.getTime() < ESPERA_MS;
  if (dentroDaEspera && t.falhas >= LIMITE_FALHAS) return "Muitas tentativas com senha errada. Tente de novo em 15 minutos.";

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? HASH_FALSO);
  if (!user || !ok) {
    await db.loginTentativa.upsert({
      where: { chave },
      create: { chave, falhas: 1 },
      update: dentroDaEspera ? { falhas: { increment: 1 } } : { falhas: 1, desde: new Date() },
    });
    return "E-mail ou senha incorretos.";
  }
  await db.loginTentativa.deleteMany({ where: { chave } });

  const token = await signSession({ sub: user.id, name: user.name, email: user.email, role: user.role });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/app");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
