import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listarDocumentos } from "@/lib/docs";
import { estadoConexao } from "@/lib/whatsapp";
import PageHeader from "@/components/PageHeader";
import DocsBoard from "@/components/docs/DocsBoard";
import GruposWhatsapp from "@/components/docs/GruposWhatsapp";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  await requireSession();
  const [estado, grupos, semProjeto, recentes, projetos] = await Promise.all([
    estadoConexao(),
    db.waGroup.findMany({ orderBy: { createdAt: "asc" } }),
    listarDocumentos({ projectId: null }),
    db.projectDocument.findMany({ where: { deletedAt: null, origem: "whatsapp" }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, titulo: true, createdAt: true, project: { select: { name: true } } } }),
    db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const on = estado?.instance?.state === "open";
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Assistente WhatsApp" subtitle="Guarda os documentos mandados nos grupos e responde pedidos e perguntas sobre os loteamentos." />
      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_1.4fr]">
        <div className="grid content-start gap-6">
          <section className="card p-5">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${on ? "bg-emerald-500" : "bg-rose-500"}`} />
              <b className="text-navy">{on ? "WhatsApp conectado" : "WhatsApp desconectado"}</b>
            </div>
            <GruposWhatsapp grupos={grupos.map(({ id, jid, name, papel }) => ({ id, jid, name, papel }))} />
          </section>
          <section className="card p-5 text-sm leading-relaxed">
            <h3 className="eyebrow mb-3">Como usar no grupo</h3>
            <ul className="grid gap-2">
              <li>📎 <b>Mandar um documento</b> (PDF ou foto) de qualquer etapa do processo. Escreva de qual loteamento é, na legenda ou antes: <i>“segue a licença da aprovação do São Judas”</i>. Ele guarda na pasta do loteamento, na etapa certa.</li>
              <li>📥 <b>Pedir de volta:</b> <i>“manda a matrícula do São Judas”</i>, ou todos os de uma etapa: <i>“manda os documentos da aprovação do São Judas”</i>.</li>
              <li>📄 <b>Proposta em PDF:</b> <i>“manda a proposta do São Judas”</i>.</li>
              <li>💬 <b>Perguntar das propostas:</b> <i>“qual o valor do lote no São Judas?”</i>, <i>“a família já abriu a proposta?”</i></li>
              <li>📊 <b>Andamento:</b> <i>“como está o São Judas?”</i> mostra os documentos por etapa e o que falta.</li>
              <li>❓ <b>ajuda</b> mostra os comandos.</li>
            </ul>
          </section>
          <section className="card p-5">
            <h3 className="eyebrow mb-3">Últimos recebidos</h3>
            {recentes.length ? (
              <ul className="grid gap-2 text-sm">
                {recentes.map((d) => (
                  <li key={d.id} className="flex justify-between gap-3">
                    <a className="font-semibold text-navy hover:underline" href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer">{d.titulo}</a>
                    <span className="shrink-0 text-muted">{d.project?.name ?? "⚠ sem loteamento"}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nada recebido ainda.</p>}
          </section>
        </div>
        <div>
          <h2 className="h-display mb-3 text-xl">Aguardando loteamento</h2>
          {semProjeto.length ? <DocsBoard docs={semProjeto} projetos={projetos} mostrarProjeto /> : <div className="card px-5 py-8 text-center text-sm text-muted">Tudo organizado: nenhum documento sem loteamento.</div>}
        </div>
      </div>
    </>
  );
}
