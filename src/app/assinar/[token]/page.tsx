import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assinaturasDe, type Papel } from "@/lib/minuta-acoes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assinatura da carta de intenção · JBL", robots: { index: false, follow: false } };

/**
 * Link de assinatura que a JBL manda (no nosso endereço): leva direto para a página de assinatura
 * da pessoa na Autentique. ?p=conjuge abre a do cônjuge.
 */
export default async function AssinarPage({ params, searchParams }: { params: { token: string }; searchParams: { p?: string } }) {
  const c = await db.intentLetter.findUnique({
    where: { assinaturaToken: params.token },
    select: { minutaStatus: true, assinaturas: true, proposal: { select: { project: { select: { name: true } } } } },
  });
  const papel = (["conjuge", "jbl"].includes(searchParams.p ?? "") ? searchParams.p : "proprietario") as Papel;
  const a = c ? assinaturasDe(c).find((x) => x.papel === papel) : undefined;
  if (c?.minutaStatus === "enviada" && a?.link && !a.assinadoEm) redirect(a.link);

  const [titulo, texto] = !c || c.minutaStatus === "revisao"
    ? ["Link substituído", "Este link de assinatura não vale mais. Fale com a JBL para receber o link novo."]
    : c.minutaStatus === "assinada" || a?.assinadoEm
      ? ["Carta assinada ✓", `A carta de intenção${c ? ` (${c.proposal.project.name})` : ""} já foi assinada. Obrigado! A cópia assinada é enviada pelo WhatsApp quando todos assinarem.`]
      : ["Link indisponível", "Não encontramos a sua assinatura neste link. Fale com a JBL."];
  return (
    <main className="grid min-h-screen place-items-center bg-alt px-4">
      <div className="w-full max-w-md rounded-md border border-line bg-white p-8 text-center shadow-sm">
        <img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora" className="mx-auto mb-6 h-12" />
        <h1 className="h-display mb-2 text-2xl">{titulo}</h1>
        <p className="text-[15px] text-ink">{texto}</p>
      </div>
    </main>
  );
}
