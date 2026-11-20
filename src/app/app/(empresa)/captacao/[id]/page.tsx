import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AreaForm from "@/components/captacao/AreaForm";
import BotaoProposta from "@/components/captacao/BotaoProposta";
import ChecklistVivo from "@/components/captacao/ChecklistVivo";
import ConversasArea from "@/components/captacao/ConversasArea";
import DocumentosArea from "@/components/captacao/DocumentosArea";
import Gate from "@/components/captacao/Gate";
import HipotesesArea from "@/components/captacao/HipotesesArea";
import MapaArea from "@/components/captacao/MapaArea";
import { ETAPAS, lerChecklist, nomeEtapa, PAPEIS, professor, progresso, tituloArea, validarDocumentos, validarHipoteses, type Etapa } from "@/lib/captacao";
import { buscarArea } from "@/lib/captacao-db";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

const ABAS = [["etapa", "Etapa atual"], ["checklist", "Checklist do estudo"], ["documentos", "Documentos"], ["config", "Configurações"]] as const;

/** Página da área: etapas no topo, ações à direita, e as abas (etapa, checklist vivo, documentos, configurações) */
export default async function AreaPagina({ params, searchParams }: { params: { id: string }; searchParams: { aba?: string } }) {
  const a = await buscarArea(params.id);
  if (!a) notFound();
  const aba = ABAS.some(([k]) => k === searchParams.aba) ? searchParams.aba! : "etapa";
  const checklist = lerChecklist(a.checklist);
  const poligono = lerPoligono(a.poligono);
  const documentos = validarDocumentos(a.documentos);
  const prof = professor({ hectares: a.hectares, checklist, conversas: a.conversas });
  const etapa = a.etapa as Etapa;
  const iEtapa = ETAPAS.findIndex(([k]) => k === etapa);
  const ha = a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "tamanho a medir";

  return (
    <>
      <PageHeader
        eyebrow={`Captação · ${nomeEtapa(etapa)}${a.situacao !== "ativa" ? ` · ${a.situacao}` : ""}`}
        title={tituloArea(a)}
        subtitle={<>{[a.nome, ha, a.corretor && a.dono ? `corretor ${a.corretor}` : null].filter(Boolean).join(" · ")}{a.relatorio && <> · <a className="font-semibold text-gold-deep underline" href={a.relatorio} target="_blank" rel="noreferrer">raio-x</a></>}</>}
        actions={<Gate id={a.id} etapa={etapa} situacao={a.situacao} />}
      />
      <div className="border-b border-line bg-white px-8 py-3">
        <ol className="flex flex-wrap gap-2">
          {ETAPAS.map(([k, n], i) => (
            <li key={k} className={`rounded-full px-3 py-1 text-[12.5px] font-semibold ${i < iEtapa ? "bg-navy-50 text-navy" : i === iEtapa ? "bg-navy text-white" : "border border-line text-muted"}`}>{i + 1}. {n}</li>
          ))}
        </ol>
        <nav className="mt-3 flex gap-5 text-sm">
          {ABAS.map(([k, n]) => (
            <Link key={k} href={`?aba=${k}`} className={`border-b-2 pb-1 font-semibold ${aba === k ? "border-gold text-navy" : "border-transparent text-muted hover:text-navy"}`}>
              {n}{k === "checklist" && <span className="ml-1 text-[11px] text-gold-deep">{progresso(checklist).pct}%</span>}
              {k === "documentos" && <span className="ml-1 text-[11px] text-gold-deep">{Object.values(documentos).filter((s) => s === "ok").length}/15</span>}
            </Link>
          ))}
        </nav>
      </div>
      <div className="grid gap-5 p-8">
        {aba === "etapa" && (
          <>
            {etapa === "captacao" && (
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <MapaArea poligono={poligono} />
                <section className="card p-5 text-sm">
                  <h3 className="eyebrow mb-3">Resumo</h3>
                  <ul className="grid gap-1.5">
                    <li><b>Cidade:</b> {a.cidade} · {a.uf}</li>
                    <li><b>Tamanho:</b> {ha}</li>
                    <li><b>Proprietário:</b> {a.dono ?? "—"}</li>
                    <li><b>Corretor:</b> {a.corretor ?? "—"}</li>
                    <li><b>Conversas:</b> {a.conversas.map((c) => `${c.nome} (${PAPEIS[c.papel] ?? c.papel})`).join(", ") || "nenhuma"}</li>
                  </ul>
                  <p className="mt-3 text-[13px] text-muted">KMZ conferido? Use “Sim, estudar” no topo para o raio-x (Estudo 1).</p>
                </section>
              </div>
            )}
            {etapa === "previabilidade" && (
              <section className="card p-5 text-sm">
                <h3 className="eyebrow mb-2">Estudo 1 · viabilidade da área</h3>
                <p>Segue o padrão JBL: zona e leis, o que pode fazer, APP, meio físico, cenários pior/médio/bom e região (m² vendido, expansão, cidades em volta). Se der 🔴, para aqui.</p>
                {a.relatorio ? <a className="btn-gold mt-3" href={a.relatorio} target="_blank" rel="noreferrer">Abrir o raio-x</a> : <p className="mt-2 text-muted">Cole o link do raio-x em Configurações quando ficar pronto.</p>}
                <div className="mt-4"><MapaArea poligono={poligono} altura={260} /></div>
              </section>
            )}
            {etapa === "reuniao" && (
              <section className="card p-5 text-sm">
                <h3 className="eyebrow mb-2">Reunião com o proprietário</h3>
                <p>Marque no calendário: o convite vai por e-mail e o grupo JBL - Avisos recebe o aviso na hora, 1 dia antes e 1 hora antes.</p>
                <Link className="btn-gold mt-3" href="/app/calendario">Marcar no calendário</Link>
              </section>
            )}
            {etapa === "proposta" && (
              <section className="card p-5 text-sm">
                <h3 className="eyebrow mb-2">Proposta</h3>
                <p>A proposta é feita no loteamento, do jeito de sempre (formatos, template, carta de intenção). A área vira loteamento uma vez só.</p>
                <div className="mt-3"><BotaoProposta id={a.id} temLoteamento={!!a.projectId} /></div>
              </section>
            )}
            {etapa === "estudo30" && <><h3 className="h-display text-xl">Estudo de 30 dias · o que precisamos provar</h3><HipotesesArea id={a.id} hipoteses={validarHipoteses(a.hipoteses)} /></>}
            {etapa === "contrato" && (
              <section className="card p-5 text-sm">
                <h3 className="eyebrow mb-2">Contrato</h3>
                <p>Contrato de parceria em andamento. {a.projectId && <Link className="font-semibold text-gold-deep underline" href={`/app/projetos/${a.projectId}/documentos`}>Documentos do loteamento</Link>}</p>
              </section>
            )}
            <section className="card p-5">
              <h3 className="eyebrow mb-2">🎓 O professor diz</h3>
              <p className="text-sm">{prof.leitura} <Link className="font-semibold text-gold-deep underline" href="?aba=checklist">Ver questionamentos ({prof.questoes.length})</Link></p>
            </section>
          </>
        )}
        {aba === "checklist" && <ChecklistVivo id={a.id} checklist={checklist} prof={prof} conclusao={a.conclusao ?? ""} />}
        {aba === "documentos" && <DocumentosArea id={a.id} documentos={documentos} />}
        {aba === "config" && (
          <>
            <AreaForm inicial={{ id: a.id, nome: a.nome, cidade: a.cidade, uf: a.uf, dono: a.dono ?? "", corretor: a.corretor ?? "", hectares: a.hectares ? String(a.hectares).replace(".", ",") : "", etapa, relatorio: a.relatorio ?? "" }} />
            <ConversasArea id={a.id} conversas={a.conversas} />
          </>
        )}
      </div>
    </>
  );
}
