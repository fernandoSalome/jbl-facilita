import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { arrumarTexto } from "@/lib/ia";
import { arrumarSimples, lerChecklist, SECOES } from "@/lib/captacao";

export const dynamic = "force-dynamic";

/** Edita um ponto do checklist escrito à mão: ao salvar, o texto é arrumado (IA, ou só acabamento sem IA) */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => ({}));
    const texto = typeof b.texto === "string" ? b.texto.trim().slice(0, 1500) : "";
    const i = Number(b.indice);
    if (!texto) return json({ error: "Escreva a resposta" }, 400);
    const a = await db.area.findFirst({ where: { id: params.id, deletedAt: null }, select: { checklist: true } });
    if (!a) return json({ error: "Área não encontrada" }, 404);
    const chk = lerChecklist(a.checklist);
    if (!Number.isInteger(i) || !chk[i]) return json({ error: "Item não encontrado" }, 404);
    const resposta = (await arrumarTexto(texto, chk[i].pergunta)) ?? arrumarSimples(texto);
    const dia = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    // mudou de seção: vai como anotação da seção nova (a pergunta antiga não vale lá)
    const secao = Number.isInteger(b.secao) && b.secao >= 0 && b.secao < SECOES.length ? b.secao : chk[i].secao;
    const pergunta = secao === chk[i].secao ? chk[i].pergunta : "Anotação";
    chk[i] = { ...chk[i], secao, pergunta, resposta, ref: chk[i].fonte === "manual" ? `${s.name} · ${dia}` : `${chk[i].ref} · editado por ${s.name} em ${dia}`.slice(0, 120) };
    await db.area.update({ where: { id: params.id }, data: { checklist: chk as unknown as Prisma.InputJsonValue } });
    return json({ ok: true, resposta });
  });
}

/** Tira um ponto do checklist */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const i = Number(new URL(req.url).searchParams.get("indice"));
    const a = await db.area.findFirst({ where: { id: params.id, deletedAt: null }, select: { checklist: true } });
    if (!a) return json({ error: "Área não encontrada" }, 404);
    const chk = lerChecklist(a.checklist);
    if (!Number.isInteger(i) || !chk[i]) return json({ error: "Item não encontrado" }, 404);
    chk.splice(i, 1);
    await db.area.update({ where: { id: params.id }, data: { checklist: chk as unknown as Prisma.InputJsonValue } });
    return json({ ok: true });
  });
}
