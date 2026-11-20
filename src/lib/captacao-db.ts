import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { criarCompromisso } from "./agenda-server";
import { lerEstudo1, resumoCentral } from "./captacao-estudos";
import { enviarTexto } from "./whatsapp";
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
export async function nutrirPorTelefone(jid: string, autor: string, texto: string, quando: Date, messageId?: string) {
  const tel = telefoneWa(jid.split("@")[0]);
  if (!tel || !texto) return 0;
  const conversas = await db.areaConversa.findMany({ where: { telefone: tel, area: { deletedAt: null } }, select: { areaId: true, nome: true, nutrir: true } });
  let n = 0;
  const dia = quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (const c of conversas) {
    // o chat da área guarda tudo da conversa ligada; o checklist só recebe com "nutrir"
    await db.areaMensagem.create({ data: { areaId: c.areaId, telefone: tel, nome: c.nome || autor, texto: texto.slice(0, 4000), quando, messageId: messageId ?? null } });
    if (c.nutrir) n += await adicionarTexto(c.areaId, texto, "whatsapp", `${c.nome || autor} · ${dia}`);
  }
  return n;
}

/** Manda mensagem pela tela (chat da área ou "perguntar a X" do professor) e guarda no chat */
export async function enviarNaConversa(areaId: string, conversaId: string, texto: string) {
  const c = await db.areaConversa.findFirst({ where: { id: conversaId, areaId }, select: { telefone: true, nome: true } });
  if (!c) throw new Error("Conversa não encontrada");
  await enviarTexto(`${c.telefone}@s.whatsapp.net`, texto);
  return db.areaMensagem.create({ data: { areaId, telefone: c.telefone, nome: c.nome, deMim: true, texto } });
}

/** Grupo marcado como Central na tela do Assistente WhatsApp */
export const grupoCentral = () => db.waGroup.findFirst({ where: { funcao: "central", papel: { not: "inativo" } }, select: { jid: true, name: true } });

/** Estudo 1 pronto: manda o resumo no Central e espera o "1 Sim · 2 Não" */
export async function perguntarNoCentral(areaId: string) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null } });
  if (!a) throw new Error("Área não encontrada");
  const g = await grupoCentral();
  if (!g) throw new Error("Nenhum grupo marcado como JBL - Central (tela Assistente WhatsApp)");
  const e = lerEstudo1(a.estudo1);
  await enviarTexto(g.jid, `🤖 ${resumoCentral(a, e)}`);
  await db.area.update({ where: { id: a.id }, data: { estudo1: { ...e, status: "perguntado", perguntadoEm: new Date().toISOString() } } });
}

/** Reunião marcada pela área: vira compromisso do calendário (e-mail, SMS e aviso no JBL - Avisos, como sempre) */
export async function marcarReuniao(areaId: string, userId: string, r: { inicio: Date; fim: Date; local: string; participantes: { nome: string; email: string; telefone: string }[] }) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null } });
  if (!a) throw new Error("Área não encontrada");
  const [primeiro, ...outros] = r.participantes;
  if (a.reuniaoId) await db.compromisso.updateMany({ where: { id: a.reuniaoId, status: "marcado" }, data: { status: "cancelado" } });
  const c = await criarCompromisso(userId, {
    tipo: "reuniao",
    titulo: `Reunião · ${a.cidade} · ${a.dono || a.corretor || a.nome}`,
    descricao: outros.length ? `Também participam: ${outros.map((p) => [p.nome, p.email, p.telefone].filter(Boolean).join(" · ")).join("; ")}` : null,
    local: r.local || null,
    inicio: r.inicio,
    fim: r.fim,
    convidadoNome: primeiro.nome,
    convidadoEmail: primeiro.email || null,
    convidadoTel: primeiro.telefone || null,
  });
  await db.area.update({ where: { id: a.id }, data: { reuniaoId: c.id, pessoas: r.participantes.map((p) => ({ ...p, papel: "Reunião" })) } });
  return c;
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

/** Link do estudo para parceiros: cria o código uma vez (o mesmo link continua valendo) */
export async function gerarLinkEstudo(areaId: string) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { estudoToken: true } });
  if (!a) throw new Error("Área não encontrada");
  if (a.estudoToken) return a.estudoToken;
  // 24 caracteres aleatórios: o link é a única chave (a página não pede login)
  const estudoToken = randomBytes(18).toString("base64url");
  await db.area.update({ where: { id: areaId }, data: { estudoToken, estudoLinkEm: new Date() } });
  return estudoToken;
}

/** Desativa: o link antigo para de abrir (gerar de novo cria outro código) */
export const desativarLinkEstudo = (areaId: string) => db.area.updateMany({ where: { id: areaId }, data: { estudoToken: null, estudoLinkEm: null } });

/** Estudo pelo link público: só com código válido e área não apagada */
export const estudoPorToken = (token: string) =>
  /^[A-Za-z0-9_-]{24}$/.test(token) ? db.area.findFirst({ where: { estudoToken: token, deletedAt: null } }) : Promise.resolve(null);
