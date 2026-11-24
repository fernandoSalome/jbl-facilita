/**
 * Trocar o KMZ da área (pedido 23/11/2026): mantém o estudo e só troca o polígono, ou apaga o estudo para
 * refazer com o KMZ novo. Funções puras; o que fala com o banco está em area-kmz-db.ts.
 */
import type { Resposta } from "./captacao";

export type ModoTroca = "manter" | "apagar";
export const ehModoTroca = (m: unknown): m is ModoTroca => m === "manter" || m === "apagar";

/** Apagar o estudo: saem do checklist só as respostas que vieram dos estudos (Raio-x); conversas e anotações ficam */
export const checklistSemEstudo = (chk: Resposta[]) => chk.filter((r) => r.fonte !== "raiox");

/** Apagado o estudo, a área que estava na Pré-viabilidade volta para a Captação (o estudo é que a levou para lá) */
export const etapaSemEstudo = (etapa: string) => (etapa === "previabilidade" ? "captacao" : etapa);

export const haTexto = (ha: number | null | undefined) => (ha == null ? "—" : `${ha.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`);
