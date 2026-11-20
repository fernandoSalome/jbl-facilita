import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { distribuir, lerChecklist, telefoneWa, type Fonte, type Resposta } from "./captacao";

/** Acesso ao banco da captação de áreas (as regras ficam em captacao.ts) */

export const listarAreas = () =>
  db.area.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { conversas: true } } } });

export const buscarArea = (id: string) => db.area.findFirst({ where: { id, deletedAt: null }, include: { conversas: { orderBy: { createdAt: "asc" } } } });

/** Acrescenta respostas ao checklist (na ordem em que chegaram) */
export async function acrescentar(areaId: string, novas: Resposta[]) {
  if (!novas.length) return 0;
  const a = await db.area.findUnique({ where: { id: areaId }, select: { checklist: true } });
  if (!a) return 0;
  const chk = [...lerChecklist(a.checklist), ...novas].slice(-2000);
  await db.area.update({ where: { id: areaId }, data: { checklist: chk as unknown as Prisma.InputJsonValue } });
  return novas.length;
}

export const adicionarTexto = (areaId: string, texto: string, fonte: Fonte, ref: string) => acrescentar(areaId, distribuir(texto, fonte, ref));

/** Conversa ligada (com "nutrir") pelo telefone de quem mandou: a mensagem entra no checklist da área */
export async function nutrirPorTelefone(jid: string, autor: string, texto: string, quando: Date) {
  const tel = telefoneWa(jid.split("@")[0]);
  if (!tel || !texto) return 0;
  const conversas = await db.areaConversa.findMany({ where: { telefone: tel, nutrir: true, area: { deletedAt: null } }, select: { areaId: true, nome: true } });
  let n = 0;
  const dia = quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (const c of conversas) n += await adicionarTexto(c.areaId, texto, "whatsapp", `${c.nome || autor} · ${dia}`);
  return n;
}

export const areasAtivas = () =>
  db.area.findMany({ where: { deletedAt: null, situacao: { not: "descartada" } }, select: { id: true, nome: true, cidade: true, dono: true, corretor: true } });

/** Limpar e extrair: as falas úteis da conversa exportada entram no checklist com a origem */
export async function extrairConversa(areaId: string, nomeConversa: string, falas: { quem: string; quando: string; texto: string }[]) {
  const novas = falas.flatMap((f) => distribuir(f.texto, "whatsapp", `${f.quem || nomeConversa} · ${f.quando}`));
  return acrescentar(areaId, novas.slice(0, 1500));
}

/** Proposta: a área vira loteamento (Project) e as propostas seguem o fluxo de sempre */
export async function loteamentoDaArea(areaId: string) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null } });
  if (!a) return null;
  if (a.projectId) {
    const p = await db.project.findFirst({ where: { id: a.projectId, deletedAt: null }, select: { id: true } });
    if (p) return p.id;
  }
  const p = await db.project.create({
    data: { name: a.nome || `${a.cidade} · ${a.dono || a.corretor}`, municipio: a.cidade, uf: a.uf, areaTotal: Math.round((a.hectares ?? 0) * 10000) || 1 },
  });
  await db.area.update({ where: { id: a.id }, data: { projectId: p.id } });
  return p.id;
}
