import { headers } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { dataDaProposta, displayStatus, parseInputs, parseOptions, parseOverrides } from "@/lib/proposals";
import JblPadrao from "@/components/template/JblPadrao";
import { contentForProposal } from "@/lib/formato-server";
import { chaveDeImpressao, pdfKeyOf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

async function load(token: string) {
  return db.proposal.findFirst({ where: { publicToken: token, deletedAt: null }, include: { project: true } });
}

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const p = await load(params.token);
  if (!p) return { title: "Proposta indisponível" };
  // prévia do link (WhatsApp): logo inteira, centralizada num quadrado
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const base = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined;
  const titulo = `Proposta de parceria · ${p.project.name}`;
  const descricao = `Proposta da JBL Incorporadora para a gleba ${p.project.name}, ${p.project.municipio} - ${p.project.uf}.`;
  return {
    title: titulo,
    description: descricao,
    robots: { index: false, follow: false },
    ...(base ? { metadataBase: new URL(base) } : {}),
    openGraph: { title: titulo, description: descricao, type: "website", images: [{ url: "/brand/og-proposta-2.png", width: 600, height: 600, alt: "Grupo JBL Incorporadora" }] },
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

export default async function PublicProposal({ params, searchParams }: { params: { token: string }; searchParams: { print?: string; pages?: string; k?: string } }) {
  const p = await load(params.token);
  // impressão feita pelo próprio servidor (PDF): sai também de rascunho e de proposta vencida
  const interna = searchParams.print === "1" && searchParams.k === chaveDeImpressao(params.token);
  if (!p || (p.status === "rascunho" && !interna)) {
    return <Unavailable title="Proposta indisponível" text="Este link não está mais ativo. Fale com a equipe da JBL para receber uma versão atualizada." />;
  }
  if (displayStatus(p) === "expirada" && !interna) {
    return <Unavailable title="Proposta expirada" text="O prazo de validade desta proposta terminou. Fale com a JBL para prorrogar." />;
  }
  const formato = await contentForProposal(p);
  // carta de intenção já enviada: a seção mostra só o protocolo (em qualquer aparelho)
  const carta = await db.intentLetter.findFirst({ where: { proposalId: p.id }, orderBy: { createdAt: "desc" }, select: { protocolo: true } });
  const printing = searchParams.print === "1";
  // número de páginas do PDF: o da impressão em andamento, ou o do último PDF (se ainda vale)
  const pdfPages = printing ? Number(searchParams.pages) || null : p.pdfKey === pdfKeyOf(p) ? p.pdfPages : null;
  return (
    <JblPadrao
      mode="public"
      printing={printing}
      pdfPages={pdfPages}
      pdfUrl={`/api/public/${p.publicToken}/pdf`}
      formato={formato}
      token={p.publicToken}
      project={p.project}
      ownerName={p.ownerName}
      inputs={parseInputs(p.inputs)}
      options={parseOptions(p.options)}
      overrides={parseOverrides(p.overrides)}
      date={dataDaProposta({ ...p, options: parseOptions(p.options) }).toISOString()}
      cartaProtocolo={carta?.protocolo ?? null}
    />
  );
}
