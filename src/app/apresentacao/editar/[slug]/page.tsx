import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { apresentacaoDe, linkApresentacao } from "@/lib/apresentacao/server";
import { conteudoDe } from "@/lib/apresentacao/tipos";
import EditorApresentacao from "@/components/apresentacao/EditorApresentacao";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Editar apresentação de custos", robots: { index: false, follow: false } };

/** Edição da apresentação de custos (endereço próprio, fora dos menus da plataforma; precisa estar logado) */
export default async function Page({ params }: { params: { slug: string } }) {
  await requireSession();
  const a = await apresentacaoDe(params.slug);
  if (!a) notFound();
  return <EditorApresentacao slug={a.slug} inicial={conteudoDe(a)} link={linkApresentacao(a.token)} publicadoEm={a.publicadoEm?.toISOString() ?? null} />;
}
