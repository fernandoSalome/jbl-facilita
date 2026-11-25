import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { lerAndamento } from "./passo-a-passo";

/** Banco do passo a passo do proprietário (as regras ficam em passo-a-passo.ts) */

/** Grava o que a equipe marcou; o que não for de um passo conhecido é descartado na leitura */
export async function salvarAndamento(areaId: string, bruto: unknown) {
  const a = lerAndamento(bruto);
  const r = await db.area.updateMany({
    where: { id: areaId, deletedAt: null },
    data: { andamento: { ...a, atualizadoEm: new Date().toISOString() } as unknown as Prisma.InputJsonValue },
  });
  if (!r.count) throw new Error("Área não encontrada");
}

/** Gera (ou devolve) o código do link do proprietário */
export async function gerarLinkAndamento(areaId: string) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { andamentoToken: true } });
  if (!a) throw new Error("Área não encontrada");
  if (a.andamentoToken) return a.andamentoToken;
  // 24 caracteres aleatórios: o link é a única chave (a página não pede login)
  const andamentoToken = randomBytes(18).toString("base64url");
  await db.area.update({ where: { id: areaId }, data: { andamentoToken, andamentoLinkEm: new Date() } });
  return andamentoToken;
}

/** Desativa: o link antigo para de abrir (gerar de novo cria outro código) */
export const desativarLinkAndamento = (areaId: string) => db.area.updateMany({ where: { id: areaId }, data: { andamentoToken: null, andamentoLinkEm: null } });

/** Passo a passo pelo link público: só com código válido e área não apagada */
export const andamentoPorToken = (token: string) =>
  /^[A-Za-z0-9_-]{24}$/.test(token)
    ? db.area.findFirst({ where: { andamentoToken: token, deletedAt: null }, select: { nome: true, cidade: true, uf: true, hectares: true, dono: true, andamento: true, updatedAt: true } })
    : Promise.resolve(null);
