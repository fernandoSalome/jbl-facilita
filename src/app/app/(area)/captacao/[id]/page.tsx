import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import AreaForm from "@/components/captacao/AreaForm";
import ChatEstudo from "@/components/captacao/ChatEstudo";
import TrocarKmz from "@/components/captacao/TrocarKmz";
import BotaoProposta from "@/components/captacao/BotaoProposta";
import ChecklistVivo from "@/components/captacao/ChecklistVivo";
import ConversasArea from "@/components/captacao/ConversasArea";
import DocumentosArea from "@/components/captacao/DocumentosArea";
import Gate from "@/components/captacao/Gate";
import MotivoSituacao from "@/components/captacao/MotivoSituacao";
import CartaDaProposta from "@/components/captacao/CartaDaProposta";
import { cartaDaArea } from "@/lib/captacao-assinatura";
import HipotesesArea from "@/components/captacao/HipotesesArea";
import MapaInterativo from "@/components/captacao/MapaInterativo";
import ChatArea from "@/components/captacao/ChatArea";
import ListaEditavel from "@/components/captacao/ListaEditavel";
import PreViabilidade from "@/components/captacao/PreViabilidade";
import { percentual } from "@/lib/estudo-andamento";
import { estudoEmAndamento } from "@/lib/estudo-andamento-db";
import { dataCurta, guardadoAte } from "@/lib/estudo-parar";
import { estudosParados } from "@/lib/estudo-parar-db";
import ReuniaoArea from "@/components/captacao/ReuniaoArea";
import LinkEstudo from "@/components/captacao/LinkEstudo";
import PassoAPasso from "@/components/captacao/PassoAPasso";
import { lerAndamento } from "@/lib/passo-a-passo";
import { linksDaCarta } from "@/lib/passo-a-passo-db";
import BotaoSpe from "@/components/captacao/BotaoSpe";
import { acaoDoPasso, lerCustos, lerEstudo1, lerEstudo2, lerPessoas, respostasDosPassos } from "@/lib/captacao-estudos";
import ProximoPasso from "@/components/captacao/ProximoPasso";
import RelatorioCompleto from "@/components/captacao/RelatorioCompleto";
import { relatorioGravado } from "@/lib/relatorio";
import { modoSimples } from "@/lib/modo";
import { db } from "@/lib/db";
import { ETAPAS, lerChecklist, nomeEtapa, PAPEIS, professor, tituloArea, validarDocumentos, validarHipoteses, type Etapa } from "@/lib/captacao";
import { buscarArea } from "@/lib/captacao-db";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

/** Abas da área (o menu fica na lateral, em layout.tsx) */
const ABAS = ["etapa", "passos", "checklist", "documentos", "custos", "pessoas", "pagina", "config", "estudo"] as const;

/** Página da área: etapas no topo, ações à direita, e as abas (etapa, checklist vivo, documentos, configurações) */
export default async function AreaPagina({ params, searchParams }: { params: { id: string }; searchParams: { aba?: string; ver?: string } }) {
  const a = await buscarArea(params.id);
  if (!a) notFound();
  const aba = (ABAS as readonly string[]).includes(searchParams.aba ?? "") ? searchParams.aba! : "etapa";
  const checklist = lerChecklist(a.checklist);
  const poligono = lerPoligono(a.poligono);
  const documentos = validarDocumentos(a.documentos);
  const etapa = a.etapa as Etapa;
  const iEtapa = ETAPAS.findIndex(([k]) => k === etapa);
  // clicar numa etapa mostra o conteúdo dela sem mudar a etapa da área
  const ver = (ETAPAS.some(([k]) => k === searchParams.ver) ? searchParams.ver : etapa) as Etapa;
  // estudo na fila ou rodando na VPS: o bloco fica desativado com o % (pedido 22/11/2026)
  // parado (pedido 23/11/2026): vem depois dos que rodam e destrava o bloco, com "Retomar"
  const andamento = ver === "previabilidade" && aba === "etapa" ? [...(await estudoEmAndamento(a.id)), ...(await estudosParados(a.id))] : [];
  const [mensagens, reuniao] = await Promise.all([
    db.areaMensagem.findMany({ where: { areaId: a.id }, orderBy: { quando: "asc" }, take: 400 }),
    a.reuniaoId ? db.compromisso.findUnique({ where: { id: a.reuniaoId }, select: { inicio: true, fim: true, local: true, status: true, convidadoNome: true, descricao: true } }) : null,
  ]);
  const custos = lerCustos(a.custos);
  const arquivos = await db.projectDocument.findMany({
    where: { deletedAt: null, OR: [{ areaId: a.id }, ...(a.projectId ? [{ projectId: a.projectId }] : [])] },
    orderBy: { createdAt: "desc" }, take: 100, select: { id: true, titulo: true, fileName: true, createdAt: true, enviadoPor: true },
  });
  const speAberta = a.projectId ? !!(await db.project.findFirst({ where: { id: a.projectId, speAssinadaEm: { not: null } }, select: { id: true } })) : false;
  const propostas = a.projectId ? await db.proposal.findMany({ where: { projectId: a.projectId, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, status: true } }) : [];
  // o checklist também sabe o que os passos já dizem (pedido 20/11/2026)
  const derivadas = respostasDosPassos({ ...a, reuniao: reuniao && reuniao.status === "marcado" ? reuniao : null });
  const prof = professor({ hectares: a.hectares, checklist: [...derivadas, ...checklist], conversas: a.conversas });
  const pessoas = lerPessoas(a.pessoas);
  // carta de intenção da proposta (só na etapa Proposta, que é onde aparece)
  const carta = (searchParams.ver ?? a.etapa) === "proposta" && aba === "etapa" ? await cartaDaArea(a.projectId) : null;
  const ha = a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "tamanho a medir";

  return (
    <>
      <PageHeader
        eyebrow={`Captação · ${nomeEtapa(etapa)}${a.situacao !== "ativa" ? ` · ${a.situacao}` : ""}`}
        title={tituloArea(a)}
        subtitle={<><Link href="?aba=config" className="mr-2 inline-block rounded-full border border-line bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-navy hover:border-gold">✏️ Editar área</Link>{[a.nome, ha, a.corretor && a.dono ? `corretor ${a.corretor}` : null].filter(Boolean).join(" · ")}{!!a.relatorioCompleto && <> · <Link className="font-semibold text-gold-deep underline" href="?aba=estudo">estudo completo</Link></>}</>}
        actions={<Gate id={a.id} etapa={etapa} situacao={a.situacao} />}
      />
      <div className="grid gap-5 p-8">
        <MotivoSituacao a={a} />
        {(() => {
          // modo simples: o próximo passo sempre no topo, com um botão (pedido 20/11/2026)
          if (!modoSimples()) return null;
          const p = acaoDoPasso(a);
          return <ProximoPasso titulo={p.titulo} explica={p.explica} botao={p.botao} href={`?aba=${p.aba}`} />;
        })()}
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
            {ver === "previabilidade" && (
              // a chave muda quando o estudo entra: os campos voltam preenchidos com o que a VPS mandou
              <PreViabilidade key={`${+a.updatedAt}-${andamento.length}`} a={a} e1={lerEstudo1(a.estudo1)} e2={lerEstudo2(a.estudo2)} temKmz={!!a.poligono}
                andamento={andamento.map((c) => ({ id: c.id, tipo: c.tipo as "estudo" | "mercado", status: c.status, pct: c.status === "parado" ? (c.progresso ?? 0) : percentual(c, c.tipo as "estudo" | "mercado"), fase: c.fase, ate: "paradoEm" in c && c.paradoEm ? dataCurta(guardadoAte(c.paradoEm)) : undefined }))} />
            )}
            {ver === "reuniao" && (
              <ReuniaoArea
                id={a.id}
                reuniao={reuniao ? { ...reuniao, inicio: reuniao.inicio.toISOString(), fim: reuniao.fim.toISOString() } : null}
                sugestao={a.conversas.filter((c) => c.papel === "proprietario" || c.papel === "corretor_proprietario").map((c) => ({ nome: c.nome, email: "", telefone: c.telefone }))}
              />
            )}
            {ver === "proposta" && (
              <>
              {/* a proposta respondida apaga o bloco de cima; a carta aparece embaixo (pedido 20/11/2026) */}
              <section className={`card p-5 text-sm ${carta ? "pointer-events-none opacity-50" : ""}`}>
                <h3 className="eyebrow mb-2">Proposta</h3>
                <p>A proposta já nasce com o que os estudos definiram (área, lote, frente, aproveitamento e valor do m²) e abre no editor de sempre, onde você muda o que quiser.</p>
                {propostas.length > 0 && (
                  <ul className="mt-3 grid gap-1.5">
                    {propostas.map((p) => (
                      <li key={p.id}><Link className="font-semibold text-navy hover:underline" href={`/app/proposta/${p.id}`}>{p.name}</Link> <span className="text-muted">· {p.status.replace("_", " ")}</span></li>
                    ))}
                  </ul>
                )}
                {carta && <p className="mt-2 font-semibold text-navy">✅ Proposta respondida: a carta de intenção chegou (abaixo).</p>}
                <div className="mt-3"><BotaoProposta id={a.id} temProposta={propostas.length > 0} /></div>
              </section>
              <CartaDaProposta carta={carta} />
              </>
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
                <p>Quando o contrato da SPE for assinado, a área vira <b>Projeto de Loteamento</b>: aparece no seletor do topo e começa a jornada (aprovação, obras, vendas). Tudo desta fase fica guardado em “Viabilidade e Contrato”, dentro do projeto.</p>
                <div className="mt-3"><BotaoSpe id={a.id} projetoAberto={speAberta ? a.projectId : null} /></div>
              </section>
            )}
            <section className="card p-5">
              <h3 className="eyebrow mb-2">O que falta confirmar</h3>
              <p className="mb-2 text-sm text-muted">{prof.leitura}</p>
              <ul className="grid gap-1 text-sm">{prof.questoes.slice(0, 5).map((q, i) => <li key={i}>• {q.texto}{q.pedirA ? <span className="text-gold-deep"> (perguntar a {q.pedirA})</span> : null}</li>)}</ul>
            </section>
          </>
        )}
        {aba === "passos" && await (async () => {
          const l = await linksDaCarta(a.projectId);
          return <PassoAPasso id={a.id} inicial={lerAndamento(a.andamento)} dono={a.dono} token={a.andamentoToken} speHref={l.temModeloSpe ? "/api/modelos/spe" : null} cartaHref={l.propostaToken ? `/p/${l.propostaToken}#intencao` : null} />;
        })()}
        {aba === "checklist" && <ChecklistVivo id={a.id} checklist={checklist} derivadas={derivadas} conclusao={a.conclusao ?? ""} cab={{ titulo: `${a.cidade} – ${a.nome}`, etapa: nomeEtapa(etapa), dono: a.dono ?? "Conforme cadastro", area: ha, municipio: `${a.cidade}/${a.uf}` }} />}
        {aba === "documentos" && <DocumentosArea id={a.id} documentos={documentos} arquivos={arquivos.map((d) => ({ id: d.id, titulo: d.titulo, fileName: d.fileName, enviadoPor: d.enviadoPor, criado: d.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) }))} />}
        {aba === "custos" && <TabelaCustos id={a.id} custos={custos} />}
        {aba === "pessoas" && (
          <>
            <ListaEditavel id={a.id} campo="pessoas" linhas={pessoas} colunas={[{ k: "nome", titulo: "Nome" }, { k: "papel", titulo: "Papel" }, { k: "email", titulo: "E-mail" }, { k: "telefone", titulo: "Telefone" }]} />
            <p className="text-[13px] text-muted">Conversas de WhatsApp ligadas: {a.conversas.map((c) => `${c.nome} (${PAPEIS[c.papel] ?? c.papel})`).join(", ") || "nenhuma"}. Para ligar, use Configurações.</p>
          </>
        )}
        {aba === "estudo" && (() => {
          // o estudo completo dentro do projeto (pedido 20/11/2026), no lugar do link para o artifact
          const rels = ([[relatorioGravado(a.relatorioCompleto), "estudo"], [relatorioGravado(a.relatorioMercado), "mercado"]] as const).flatMap(([r, estudo]) => (r ? [{ ...r, estudo }] : []));
          if (!rels.length) return <section className="card p-5 text-sm">Esta área ainda não tem o estudo completo. Suba o raio-x em 🌐 Página do estudo.</section>;
          return (
            <>
              {rels.length > 1 && (
                <nav className="flex flex-wrap gap-2">
                  {rels.map((r, i) => <a key={i} href={`#estudo-${i + 1}`} className="btn-ghost">{r.estudo === "estudo" ? "🔬 Viabilidade Legal" : "📊 Viabilidade Mercadológica"}</a>)}
                </nav>
              )}
              {rels.map((rel, i) => (
                <section key={i} id={`estudo-${i + 1}`} className="card px-8 py-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="h-display flex-1 text-[26px]">{rel.titulo}</h2>
                    <ChatEstudo areaId={a.id} estudo={rel.estudo} />
                    <Link className="btn-ghost" href="?aba=etapa&ver=previabilidade">◀ Voltar ao estudo</Link>
                  </div>
                  {rel.veredito && <p className="mt-2 font-semibold text-gold-ink">{rel.veredito}</p>}
                  <RelatorioCompleto r={rel} />
                </section>
              ))}
            </>
          );
        })()}
        {aba === "pagina" && <LinkEstudo id={a.id} token={a.estudoToken} temRelatorio={!!a.relatorioCompleto} temMercado={!!a.relatorioMercado} />}
        {aba === "config" && (
          <>
            <AreaForm inicial={{ id: a.id, nome: a.nome, cidade: a.cidade, uf: a.uf, dono: a.dono ?? "", corretor: a.corretor ?? "", hectares: a.hectares ? String(a.hectares).replace(".", ",") : "", etapa, relatorio: a.relatorio ?? "" }} />
            <TrocarKmz id={a.id} temKmz={!!a.poligono} haAtual={a.hectares} />
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
