import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import TemplateActions, { UploadTemplateButton } from "@/components/TemplateActions";

export const dynamic = "force-dynamic";

export default async function Templates() {
  const session = await requireSession();
  const templates = await db.template.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, description: true, status: true, key: true, sourceFileName: true, createdAt: true, _count: { select: { proposals: { where: { deletedAt: null } } } } },
  });

  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora"
        title="Templates de proposta"
        subtitle="O modelo base das propostas, com um conteúdo para cada formato (loteamento, condomínio, chacreamento). Alterar aqui pode valer para as propostas já feitas."
        actions={<UploadTemplateButton />}
      />
      <div className="grid gap-5 p-8 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="card overflow-hidden">
            <div className="relative h-44 overflow-hidden border-b border-line bg-white">
              {t.key === "jbl-padrao" ? (
                <div className="absolute inset-0 origin-top-left scale-[0.32] p-0" style={{ width: "312%" }}>
                  <div className="flex items-center justify-between border-b border-line px-10 py-6">
                    <img src="/brand/lockup.webp" alt="" className="h-16" />
                    <span className="rounded bg-gold px-8 py-5 text-2xl font-bold text-navy">Carta de intenção</span>
                  </div>
                  <div className="grid grid-cols-[1.3fr_1fr] items-center gap-10 px-10 py-10">
                    <div className="font-display text-[80px] leading-none text-navy">Exemplo Template 1<span className="block text-gold-deep">Modelo de proposta</span></div>
                    <div className="border-l-4 border-gold pl-8 text-3xl leading-relaxed text-muted">A família entra com a terra. A JBL entra com os projetos, as obras e as vendas.</div>
                  </div>
                  <img src="/demo/sao-judas-tadeu-ii.jpg" alt="" className="mx-10 h-64 w-[calc(100%-80px)] rounded object-cover" />
                </div>
              ) : (
                <div className="grid h-full place-items-center bg-alt text-center text-sm text-muted">
                  <span>📄 {t.sourceFileName ?? "Arquivo enviado"}<br /><span className="text-[12px]">em preparação pela equipe</span></span>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-lg text-navy">{t.name}</div>
                {t.status === "ativo" ? (
                  <span className="rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">Ativo</span>
                ) : (
                  <span className="rounded-sm bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">Em preparação</span>
                )}
              </div>
              {t.description && <p className="mt-1 text-[13px] text-muted">{t.description}</p>}
              <div className="mt-3 flex items-center justify-between text-[12.5px] text-muted">
                <span>{t._count.proposals} proposta(s) · desde {fmtDate(t.createdAt)}</span>
                <TemplateActions id={t.id} canPreview={t.key === "jbl-padrao"} isAdmin={session.role === "ADMIN"} inUse={t._count.proposals > 0} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-8 mb-8 rounded-md border-l-[3px] border-gold bg-gold-soft px-5 py-4 text-[13.5px] text-ink">
        <b className="text-navy">Como funciona um template novo:</b> envie o PDF, Word ou PowerPoint do modelo. A equipe transforma o arquivo em template,
        marcando onde entram os números do estudo, e ele aparece aqui como “Ativo” para ser escolhido nas próximas propostas.
      </div>
    </>
  );
}
