import { cookies } from "next/headers";
import { db } from "./db";
import { hash } from "./minuta";

/** Cookie da sessão aberta depois de confirmar o celular: "<token>.<segredo>" */
export const COOKIE_ASSINATURA = "jbl_assinatura";

export const cartaPorToken = (token: string) =>
  db.intentLetter.findUnique({ where: { assinaturaToken: token }, include: { proposal: { include: { project: true } } } });

/** A pessoa já confirmou o celular neste aparelho (e a sessão ainda vale)? */
export function sessaoOk(c: { assinaturaToken: string | null; sessaoHash: string | null; sessaoExpira: Date | null }) {
  const v = cookies().get(COOKIE_ASSINATURA)?.value ?? "";
  const [token, segredo] = v.split(".");
  return !!(c.assinaturaToken && token === c.assinaturaToken && segredo && c.sessaoHash === hash(segredo) && c.sessaoExpira && c.sessaoExpira > new Date());
}

export const mascararTelefone = (t: string) => {
  const d = t.replace(/\D/g, "");
  return d.length >= 4 ? `(${d.slice(-11, -9) || "••"}) •••••-${d.slice(-4)}` : "";
};
