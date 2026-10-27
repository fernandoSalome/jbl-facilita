import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cartaPorToken, COOKIE_ASSINATURA } from "@/lib/assinatura";
import { hash, novaSessao } from "@/lib/minuta";

/** Confere o código; certo, abre a sessão por 2 horas neste aparelho */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const c = await cartaPorToken(params.token);
  if (!c || c.minutaStatus === "revisao") return json({ error: "Link inválido. Fale com a JBL." }, 404);
  const { codigo, telefone } = (await req.json().catch(() => ({}))) as { codigo?: string; telefone?: string };
  if (!c.codigoHash || !c.codigoExpira || c.codigoExpira < new Date()) return json({ error: "Código vencido. Peça um novo." }, 400);
  if (c.codigoTentativas >= 5) return json({ error: "Muitas tentativas. Peça um novo código." }, 429);
  if (hash(`${c.id}:${(codigo ?? "").replace(/\D/g, "")}`) !== c.codigoHash) {
    await db.intentLetter.update({ where: { id: c.id }, data: { codigoTentativas: { increment: 1 } } });
    return json({ error: "Código incorreto." }, 400);
  }
  const sessao = novaSessao();
  await db.intentLetter.update({
    where: { id: c.id },
    data: { codigoHash: null, sessaoHash: hash(sessao), sessaoExpira: new Date(Date.now() + 2 * 3600 * 1000), telefoneConfirmado: (telefone ?? "").replace(/\D/g, "") || null },
  });
  cookies().set(COOKIE_ASSINATURA, `${params.token}.${sessao}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 2 * 3600 });
  return json({ ok: true });
}
