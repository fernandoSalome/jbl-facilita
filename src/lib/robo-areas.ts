/**
 * Áreas da Captação no robô do WhatsApp (pedido 20/11/2026): o robô lista as áreas junto com os loteamentos,
 * lembra a última área citada no grupo ("manda documento dele") e guarda documentos na área.
 */
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { areaPorTexto, tituloArea, validarDocumentos } from "./captacao";

const CONTEXTO_MIN = 30;

export type AreaLeve = { id: string; nome: string; cidade: string; uf: string; dono: string | null; corretor: string | null; projectId?: string | null };

/**
 * Áreas ativas da Captação (pedido 20/11/2026): todas, inclusive as que já têm loteamento por trás, até a SPE ser
 * assinada. Com SPE, a área vira Projeto de Loteamento e aparece como loteamento.
 */
export const areasDaCaptacao = (): Promise<AreaLeve[]> =>
  db.area.findMany({
    where: { deletedAt: null, situacao: { not: "descartada" } },
    select: { id: true, nome: true, cidade: true, uf: true, dono: true, corretor: true, projectId: true },
    orderBy: { updatedAt: "desc" },
  }).then(async (as) => {
    // tira as que já viraram Projeto de Loteamento (SPE assinada)
    const comSpe = new Set((await db.project.findMany({ where: { speAssinadaEm: { not: null } }, select: { id: true } })).map((p) => p.id));
    return as.filter((a) => !a.projectId || !comSpe.has(a.projectId));
  });

/** Lista para "De qual?": as áreas em captação e, se houver, os Projetos de Loteamento (com SPE assinada) */
export function listaComAreas(projetosComSpe: { name: string }[], areas: AreaLeve[]) {
  const l = areas.map((a) => `• ${tituloArea(a)}`);
  if (projetosComSpe.length) l.push("", "*Projetos de loteamento:*", ...projetosComSpe.map((p) => `• ${p.name}`));
  return l.join("\n") || "Nenhuma área cadastrada ainda.";
}

/** A área citada na mensagem (só se for uma) */
export function areaCitada(texto: string, areas: AreaLeve[]) {
  const achadas = texto ? areaPorTexto(texto, areas) : [];
  return achadas.length === 1 ? achadas[0] : null;
}

/** Última área citada no grupo, se for mais recente que o último loteamento citado (até 30 minutos) */
export function areaDoContexto(g: { contextoAreaId: string | null; contextoAreaAt: Date | null; contextoAt: Date | null }, areas: AreaLeve[]) {
  if (!g.contextoAreaId || !g.contextoAreaAt || Date.now() - g.contextoAreaAt.getTime() > CONTEXTO_MIN * 60e3) return null;
  if (g.contextoAt && g.contextoAt > g.contextoAreaAt) return null;
  return areas.find((a) => a.id === g.contextoAreaId) ?? null;
}

export const lembrarArea = (grupoJid: string, areaId: string) => db.waGroup.updateMany({ where: { jid: grupoJid }, data: { contextoAreaId: areaId, contextoAreaAt: new Date() } });

/** Tipo de documento lido pelo robô → item da lista de documentos da área */
export const DOC_DO_TIPO: Record<string, string> = {
  matricula: "Matrícula atualizada",
  iptu: "IPTU / CCIR",
  pessoal: "RG/CPF dos proprietários",
  foto: "Fotos da área",
};

/** Marca o documento como recebido na lista da área */
export async function marcarRecebido(areaId: string, tipo: string) {
  const nome = DOC_DO_TIPO[tipo];
  if (!nome) return;
  const a = await db.area.findUnique({ where: { id: areaId }, select: { documentos: true } });
  if (!a) return;
  await db.area.update({ where: { id: areaId }, data: { documentos: { ...validarDocumentos(a.documentos), [nome]: "ok" } as Prisma.InputJsonValue } });
}
