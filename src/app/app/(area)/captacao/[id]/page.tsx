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
import MapaInterativo from "@/components/captacao/MapaInterativo";
import ChatArea from "@/components/captacao/ChatArea";
import ListaEditavel from "@/components/captacao/ListaEditavel";
import PreViabilidade from "@/components/captacao/PreViabilidade";
import ReuniaoArea from "@/components/captacao/ReuniaoArea";
import LinkEstudo from "@/components/captacao/LinkEstudo";
import { lerCustos, lerEstudo1, lerEstudo2, lerPessoas } from "@/lib/captacao-estudos";
import { db } from "@/lib/db";
import { ETAPAS, lerChecklist, nomeEtapa, PAPEIS, professor, tituloArea, validarDocumentos, validarHipoteses, type Etapa } from "@/lib/captacao";
import { buscarArea } from "@/lib/captacao-db";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

/** Abas da área (o menu fica na lateral, em layout.tsx) */
const ABAS = ["etapa", "checklist", "documentos", "custos", "pessoas", "pagina", "config"] as const;

/** Página da área: etapas no topo, ações à direita, e as abas (etapa, checklist vivo, documentos, configurações) */
export default async function AreaPagina({ params, searchParams }: { params: { id: string }; searchParams: { aba?: string; ver?: string } }) {
  const a = await buscarArea(params.id);
  if (!a) notFound();
  const aba = (ABAS as readonly string[]).includes(searchParams.aba ?? "") ? searchParams.aba! : "etapa";
  const checklist = lerChecklist(a.checklist);
  const poligono = lerPoligono(a.poligono);
  const documentos = validarDocumentos(a.documentos);
  const prof = professor({ hectares: a.hectares, checklist, conversas: a.conversas });
  const etapa = a.etapa as Etapa;
  const iEtapa = ETAPAS.findIndex(([k]) => k === etapa);
  // clicar numa etapa mostra o conteúdo dela sem mudar a etapa da área
  const ver = (ETAPAS.some(([k]) => k === searchParams.ver) ? searchParams.ver : etapa) as Etapa;
  const [mensagens, reuniao] = await Promise.all([
    db.areaMensagem.findMany({ where: { areaId: a.id }, orderBy: { quando: "asc" }, take: 400 }),
    a.reuniaoId ? db.compromisso.findUnique({ where: { id: a.reuniaoId }, select: { inicio: true, fim: true, local: true, status: true, convidadoNome: true, descricao: true } }) : null,
  ]);
  const custos = lerCustos(a.custos);
  const pessoas = lerPessoas(a.pessoas);
  const ha = a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "tamanho a medir";

  return (
    <>
      <PageHeader
        eyebrow={`Captação · ${nomeEtapa(etapa)}${a.situacao !== "ativa" ? ` · ${a.situacao}` : ""}`}
        title={tituloArea(a)}
        subtitle={<><Link href="?aba=config" className="mr-2 inline-block rounded-full border border-line bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-navy hover:border-gold">✏️ Editar área</Link>{[a.nome, ha, a.corretor && a.dono ? `corretor ${a.corretor}` : null].filter(Boolean).join(" · ")}{a.relatorio && <> · <a className="font-semibold text-gold-deep underline" href={a.relatorio} target="_blank" rel="noreferrer">raio-x</a></>}</>}
        actions={<Gate id={a.id} etapa={etapa} situacao={a.situacao} />}
      />
      <div className="border-b border-line bg-white px-8 py-3">
        <ol className="flex flex-wrap gap-2">
          {ETAPAS.map(([k, n], i) => (
            <li key={k}>
              <Link href={`?aba=etapa&ver=${k}`} className={`block rounded-full px-3 py-1 text-[12.5px] font-semibold ${i < iEtapa ? "bg-navy-50 text-navy" : i === iEtapa ? "bg-navy text-white" : "border border-line text-muted"} ${aba === "etapa" && ver === k ? "ring-2 ring-gold ring-offset-1" : ""}`}>{i < iEtapa ? "✔" : i + 1}. {n}</Link>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid gap-5 p-8">
        {aba === "etapa" && (
          <>
            {ver === "captacao" && (
              <>
              <MapaInterativo poligono={poligono} altura={560} />
              <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <ChatArea id={a.id} conversas={a.conversas} mensagens={mensagens.map((m) => ({ ...m, quando: m.quando.toISOString() }))} />
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
              </>
            )}
            {ver === "previabilidade" && <PreViabilidade a={a} e1={lerEstudo1(a.estudo1)} e2={lerEstudo2(a.estudo2)} />}
            {ver === "reuniao" && (
              <ReuniaoArea
                id={a.id}
                reuniao={reuniao ? { ...reuniao, inicio: reuniao.inicio.toISOString(), fim: reuniao.fim.toISOString() } : null}
                sugestao={a.conversas.filter((c) => c.papel === "proprietario" || c.papel === "corretor_proprietario").map((c) => ({ nome: c.nome, email: "", telefone: c.telefone }))}
              />
            )}
            {ver === "proposta" && (
              <section className="card p-5 text-sm">
                <h3 className="eyebrow mb-2">Proposta</h3>
                <p>A proposta é feita no loteamento, do jeito de sempre (formatos, template, carta de intenção). A área vira loteamento uma vez só.</p>
                <div className="mt-3"><BotaoProposta id={a.id} temLoteamento={!!a.projectId} /></div>
              </section>
            )}
            {ver === "estudo30" && (
              <>
                <h3 className="h-display text-xl">Estudo de 30 dias · o que precisamos provar</h3>
                <HipotesesArea id={a.id} hipoteses={validarHipoteses(a.hipoteses)} />
                <h3 className="h-display text-xl">💰 Custos preliminares (para validar)</h3>
                <TabelaCustos id={a.id} custos={custos} />
              </>
            )}
            {ver === "contrato" && (
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
        {aba === "custos" && <TabelaCustos id={a.id} custos={custos} />}
        {aba === "pessoas" && (
          <>
            <ListaEditavel id={a.id} campo="pessoas" linhas={pessoas} colunas={[{ k: "nome", titulo: "Nome" }, { k: "papel", titulo: "Papel" }, { k: "email", titulo: "E-mail" }, { k: "telefone", titulo: "Telefone" }]} />
            <p className="text-[13px] text-muted">Conversas de WhatsApp ligadas: {a.conversas.map((c) => `${c.nome} (${PAPEIS[c.papel] ?? c.papel})`).join(", ") || "nenhuma"}. Para ligar, use Configurações.</p>
          </>
        )}
        {aba === "pagina" && <LinkEstudo id={a.id} token={a.estudoToken} temRelatorio={!!a.relatorioCompleto} />}
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

function TabelaCustos({ id, custos }: { id: string; custos: ReturnType<typeof lerCustos> }) {
  const total = custos.reduce((t, c) => t + c.valor, 0);
  return (
    <>
      <ListaEditavel id={id} campo="custos" linhas={custos} colunas={[
        { k: "item", titulo: "Item", largura: "30%" }, { k: "valor", titulo: "Valor (R$)", tipo: "numero" }, { k: "base", titulo: "Base da estimativa" },
        { k: "status", titulo: "Situação", tipo: "select", opcoes: [["estimado", "Estimado"], ["cotado", "Cotado"], ["confirmado", "Confirmado"]] },
      ]} />
      <p className="text-sm font-semibold text-navy">Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</p>
    </>
  );
}
