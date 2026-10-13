import type { Metadata } from "next";
import { db } from "@/lib/db";
import { displayStatus, parseInputs, parseOptions, parseOverrides } from "@/lib/proposals";
import JblPadrao from "@/components/template/JblPadrao";

export const dynamic = "force-dynamic";

async function load(token: string) {
  return db.proposal.findFirst({ where: { publicToken: token, deletedAt: null }, include: { project: true } });
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const p = await load(params.token);
  if (!p) return { title: "Proposta indisponível" };
  return {
    title: `Proposta de parceria · ${p.project.name}`,
    description: `Proposta da JBL Incorporadora para a gleba ${p.project.name}, ${p.project.municipio} - ${p.project.uf}.`,
    robots: { index: false, follow: false },
  };
}

function Unavailable({ title, text }: { title: string; text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-alt p-6 text-center">
      <div className="max-w-md">
        <img src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora" className="mx-auto mb-8 w-40" />
        <h1 className="h-display text-3xl">{title}</h1>
        <p className="mt-3 text-muted">{text}</p>
        <a className="btn-gold mt-6" href="https://wa.me/5511940091744">Falar com a JBL</a>
      </div>
    </main>
  );
}

export default async function PublicProposal({ params }: { params: { token: string } }) {
  const p = await load(params.token);
  if (!p || p.status === "rascunho") {
    return <Unavailable title="Proposta indisponível" text="Este link não está mais ativo. Fale com a equipe da JBL para receber uma versão atualizada." />;
  }
  if (displayStatus(p) === "expirada") {
    return <Unavailable title="Proposta expirada" text="O prazo de validade desta proposta terminou. Fale com a JBL para prorrogar." />;
  }
  return (
    <JblPadrao
      mode="public"
      token={p.publicToken}
      project={p.project}
      ownerName={p.ownerName}
      inputs={parseInputs(p.inputs)}
      options={parseOptions(p.options)}
      overrides={parseOverrides(p.overrides)}
      date={(p.publishedAt ?? p.createdAt).toISOString()}
    />
  );
}
