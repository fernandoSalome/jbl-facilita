import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { formatosDoTemplate } from "@/lib/formato-server";
import { parseFormato } from "@/lib/formatos";
import TemplateEditor from "@/components/template/TemplateEditor";

export const dynamic = "force-dynamic";

/** Edição do template base em tela cheia: textos comuns aos 4 tipos de loteamento, listas por tipo; salvo pelo botão "Salvar". */
export default async function ModeloPage({ params, searchParams }: { params: { id: string }; searchParams: { formato?: string } }) {
  await requireSession();
  const t = await db.template.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!t || t.key !== "jbl-padrao") notFound();
  const formatos = await formatosDoTemplate(t.id);
  const contagem = await db.proposal.groupBy({
    by: ["formato", "status"],
    where: { templateId: t.id, deletedAt: null },
    _count: true,
  });
  const counts = Object.fromEntries(
    formatos.map((f) => {
      const rows = contagem.filter((c) => c.formato === f.key);
      return [f.key, { total: rows.reduce((s, r) => s + r._count, 0), enviadas: rows.filter((r) => r.status !== "rascunho").reduce((s, r) => s + r._count, 0) }];
    }),
  );
  return (
    <TemplateEditor
      templateId={t.id}
      templateName={t.name}
      formatos={formatos.map(({ key, content, createdAt }) => ({ key, content, createdAt }))}
      counts={counts}
      inicial={parseFormato(searchParams.formato)}
    />
  );
}
