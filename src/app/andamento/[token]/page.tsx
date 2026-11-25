import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PaginaAndamento from "@/components/andamento/PaginaAndamento";
import { andamentoPorToken } from "@/lib/passo-a-passo-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Acompanhamento da parceria · JBL Incorporadora", robots: { index: false, follow: false } };

/**
 * Passo a passo da parceria para o proprietário (pedido 25/11/2026): link público com código, no visual da
 * proposta. Só mostra os passos, o que já foi realizado e o próximo; nada de estudo, conversas ou números.
 */
export default async function AndamentoPublico({ params }: { params: { token: string } }) {
  const a = await andamentoPorToken(params.token);
  if (!a) notFound();
  return <PaginaAndamento a={a} />;
}
