import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { conteudoDe, type Conteudo } from "@/lib/apresentacao/tipos";
import Apresentacao from "@/components/apresentacao/Apresentacao";

export const dynamic = "force-dynamic";

async function publicada(token: string) {
  const a = await db.apresentacao.findUnique({ where: { token } });
  return a?.publicado ? conteudoDe(a.publicado as Parameters<typeof conteudoDe>[0]) : null;
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const c = await publicada(params.token);
  const titulo = c ? `${c.textos.titulo ?? "Chácaras Primavera"} · Custos do empreendimento` : "Apresentação";
  return { title: titulo, robots: { index: false, follow: false } };
}

/** Link do proprietário: só a apresentação (a versão do último "Gerar link"), sem nenhum controle de edição */
export default async function Page({ params }: { params: { token: string } }) {
  const c: Conteudo | null = await publicada(params.token);
  if (!c) notFound();
  return <Apresentacao c={c} />;
}
