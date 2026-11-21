import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { nomeDoGrupo } from "@/lib/whatsapp";
import { ehFuncao } from "@/lib/grupos";

export const dynamic = "force-dynamic";

/** Cadastra um grupo para o robô atender (ID do grupo: 1203…@g.us) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const jid = String(b.jid ?? "").trim();
    if (!/^\d{10,30}@g\.us$/.test(jid)) return json({ error: "ID de grupo inválido. Exemplo: 120363431551313202@g.us" }, 400);
    const nome = (await nomeDoGrupo(jid).catch(() => "")) || jid;
    const g = await db.waGroup.upsert({ where: { jid }, create: { jid, name: nome, papel: "controle" }, update: { papel: "controle", name: nome } });
    return json({ ok: true, grupo: g });
  });
}

/** Para de atender o grupo (o registro fica, marcado como inativo) */
export async function DELETE(req: Request) {
  return withSession(async () => {
    const id = new URL(req.url).searchParams.get("id") ?? "";
    await db.waGroup.update({ where: { id }, data: { papel: "inativo" } });
    return json({ ok: true });
  });
}

/** Define para que serve o grupo: avisos, central, estudos ou projeto (vazio = só documentos) */
export async function PATCH(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const funcao = b.funcao === "" || b.funcao === null ? null : ehFuncao(b.funcao) ? b.funcao : undefined;
    if (funcao === undefined) return json({ error: "Função inválida" }, 400);
    // Avisos é um grupo só: quem já era perde a marca
    if (funcao === "avisos") await db.waGroup.updateMany({ where: { funcao: "avisos" }, data: { funcao: null } });
    await db.waGroup.update({ where: { id: String(b.id ?? "") }, data: { funcao } });
    return json({ ok: true });
  });
}
