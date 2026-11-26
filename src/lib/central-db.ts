/**
 * JBL - Central no banco (pedido 25/11/2026): memória de 90 dias, a conversa em andamento e as ações que o robô
 * executa depois de entender o pedido (as regras ficam em central.ts).
 */
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { ETAPAS, nomeEtapa, proximaEtapa, tituloArea } from "./captacao";
import { marcarReuniao, propostaDaArea } from "./captacao-db";
import { lerEstudo1 } from "./captacao-estudos";
import { conversaValida, decidir, lerPedido, pedidoRapido, promptCentral, textoMenu, type Conversa, type Dados, type Decisao } from "./central";
import { NOME_ESTUDO } from "./estudo-andamento";
import { iaJson } from "./ia";
import { confirmacaoLembrete, resumoArea } from "./lembretes";
import { areaDoContexto, lembrarArea, marcarRecebido } from "./robo-areas";
import { LINK_BASE } from "./site";
import type { Recebida } from "./whatsapp";

const MEMORIA_DIAS = 90;
/** quanto o robô espera depois de um arquivo para responder o lote de uma vez */
const ESPERA_LOTE_MS = 15_000;

type Grupo = { id: string; jid: string; name: string; conversa: unknown; conversaEm: Date | null; contextoAreaId: string | null; contextoAreaAt: Date | null; contextoAt: Date | null };
type Responder = (t: string) => Promise<unknown>;

/* ---------------- memória ---------------- */

/** Guarda a mensagem do Central (de qualquer pessoa ou do robô). Outros grupos não entram. */
export async function guardarNaMemoria(m: Recebida) {
  if (!m.grupo.endsWith("@g.us") || (!m.texto && !m.arquivo)) return;
  const g = await db.waGroup.findUnique({ where: { jid: m.grupo }, select: { funcao: true, papel: true } });
  if (g?.funcao !== "central" || g.papel === "inativo") return;
  await db.mensagemCentral.createMany({
    data: [{ grupoJid: m.grupo, messageId: m.id, autor: m.autor.slice(0, 80), deMim: m.deMim, texto: m.texto.slice(0, 4000), arquivo: m.arquivo?.fileName.slice(0, 200) ?? null, quando: m.quando }],
    skipDuplicates: true,
  });
}

/** Apaga o que passou de 90 dias (chamado pela fila da VPS) */
export const limparMemoria = () => db.mensagemCentral.deleteMany({ where: { quando: { lt: new Date(Date.now() - MEMORIA_DIAS * 86400e3) } } });

const memoriaDoGrupo = (jid: string) =>
  db.mensagemCentral.findMany({ where: { grupoJid: jid, quando: { gt: new Date(Date.now() - MEMORIA_DIAS * 86400e3) } }, orderBy: { quando: "desc" }, take: 40 }).then((l) => l.reverse());

const salvarConversa = (grupoId: string, c: Conversa | null) =>
  db.waGroup.update({ where: { id: grupoId }, data: { conversa: c ? (c as unknown as Prisma.InputJsonValue) : Prisma.DbNull, conversaEm: c ? new Date() : null } });

/** Áreas ativas para a conversa (as que já viraram loteamento com SPE também: dá para perguntar a situação) */
const areasParaConversa = () =>
  db.area.findMany({
    where: { deletedAt: null, situacao: { not: "descartada" } },
    select: { id: true, nome: true, cidade: true, uf: true, dono: true, corretor: true, etapa: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  }).then((as) => as.map((a) => ({ ...a, titulo: tituloArea(a) })));

/** Quem assina o que o robô cria (proposta, reunião): o primeiro administrador */
async function administrador() {
  const u = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!u) throw new Error("Nenhum administrador cadastrado.");
  return u.id;
}

/* ---------------- conversa ---------------- */

/**
 * Mensagem de texto no Central: entende (resposta curta sem IA; o resto com a IA, lendo a memória), decide e executa.
 * Devolve false quando não é com o robô, para seguir o fluxo antigo.
 */
export async function tratarConversaCentral(m: Recebida, g: Grupo, responder: Responder, soComConversaAberta = false): Promise<boolean> {
  const conversa = conversaValida(g.conversa, g.conversaEm);
  if (soComConversaAberta && !conversa) return false;
  const areas = await areasParaConversa();
  let p = conversa ? pedidoRapido(m.texto) : null;
  if (!p) {
    if (soComConversaAberta && conversa?.passo !== "qual_area" && conversa?.passo !== "docs_de_quem") return false;
    const j = await iaJson(promptCentral(m.texto, await memoriaDoGrupo(g.jid), areas, conversa));
    if (!j) return false;
    p = lerPedido(j, new Set(areas.map((a) => a.id)));
  }
  const d = decidir(conversa, p, areas, areaDoContexto(g, areas)?.id ?? null);
  if (d.tipo === "ignorar") return false;
  if (d.tipo === "responder") {
    await salvarConversa(g.id, d.conversa);
    await responder(d.texto);
    return true;
  }
  let texto: string;
  try {
    texto = await executar(d, m, g);
  } catch (e) {
    texto = `Não consegui: ${(e as Error).message.slice(0, 200)}`;
  }
  await salvarConversa(g.id, d.conversa);
  if (d.areaId) await lembrarArea(g.jid, d.areaId);
  await responder(texto);
  return true;
}

async function executar(d: Extract<Decisao, { tipo: "executar" }>, m: Recebida, g: Grupo): Promise<string> {
  if (d.acao === "lembrete") return criarLembrete(d.dados, m.grupo, m.autor);
  if (d.acao === "reuniao") return criarReuniao(d.areaId, d.dados);
  const a = d.areaId ? await db.area.findFirst({ where: { id: d.areaId, deletedAt: null } }) : null;
  if (!a) throw new Error("não achei a área.");
  if (d.acao === "documentos") return documentosDaArea(a, d.dados.docIds ?? [], g);
  const titulo = tituloArea(a);
  if (d.acao === "status") {
    return `${resumoArea(a)}\n\n${textoMenu({ id: a.id, titulo, etapa: a.etapa })}`;
  }
  if (d.acao === "avancar") {
    const prox = proximaEtapa(a.etapa);
    if (!prox) return `*${titulo}* já está na última etapa.`;
    await db.area.update({ where: { id: a.id }, data: { etapa: prox } });
    // na Proposta, a proposta nasce com os dados dos estudos, como no botão da tela
    const extra = prox === "proposta" ? `\n📝 Proposta criada com os dados dos estudos: ${LINK_BASE}/app/proposta/${await propostaDaArea(a.id, await administrador())}` : "";
    return `✅ *${titulo}* passou para *${nomeEtapa(prox)}*.${extra}`;
  }
  if (d.acao === "estudo") {
    const { pedirEstudoPelaTela } = await import("./estudo-andamento-db");
    const legalFeita = !!a.relatorioCompleto || !!lerEstudo1(a.estudo1).semaforo;
    const tipo = legalFeita ? "mercado" : "estudo";
    await pedirEstudoPelaTela(a.id, tipo, m.autor || "WhatsApp");
    return `🧠 Coloquei a ${NOME_ESTUDO[tipo]} de *${titulo}* na fila. O JBL - Avisos avisa quando começar, e o resumo sai aqui.`;
  }
  // proposta: nasce com os dados dos estudos; a área vai para a etapa Proposta se ainda não chegou lá
  const id = await propostaDaArea(a.id, await administrador());
  const iProposta = ETAPAS.findIndex(([k]) => k === "proposta");
  const moveu = ETAPAS.findIndex(([k]) => k === a.etapa) < iProposta;
  if (moveu) await db.area.update({ where: { id: a.id }, data: { etapa: "proposta" } });
  return `📝 Proposta de *${titulo}* pronta como rascunho${moveu ? " (a área foi para a etapa Proposta)" : ""}. Confira e envie pelo editor:\n${LINK_BASE}/app/proposta/${id}`;
}

async function criarLembrete(dados: Dados, grupoJid: string, autor: string) {
  const quando = new Date(dados.quando!);
  let destino = grupoJid;
  if (dados.avisos) {
    const { grupoMonitoring } = await import("./agenda-whatsapp");
    destino = (await grupoMonitoring())?.jid ?? grupoJid;
  }
  const texto = (dados.texto || "lembrete").slice(0, 400);
  await db.lembrete.create({ data: { texto, quando, grupoJid: destino, pedidoPor: autor || null } });
  return `${confirmacaoLembrete(quando, texto)}${dados.avisos && destino !== grupoJid ? " (no JBL - Avisos)" : ""}`;
}

async function criarReuniao(areaId: string | null, dados: Dados) {
  const inicio = new Date(dados.quando!);
  const fim = new Date(+inicio + 60 * 60e3);
  const userId = await administrador();
  const a = areaId ? await db.area.findFirst({ where: { id: areaId, deletedAt: null } }) : null;
  const participantes = dados.participantes?.length ? dados.participantes : [{ nome: a?.dono || a?.corretor || "Proprietário", email: "", telefone: "" }];
  if (a) await marcarReuniao(a.id, userId, { inicio, fim, local: dados.local ?? "", participantes });
  else {
    const { criarCompromisso } = await import("./agenda-server");
    const [p, ...outros] = participantes;
    await criarCompromisso(userId, {
      tipo: "reuniao", titulo: `Reunião · ${p.nome}`, inicio, fim, local: dados.local || null,
      descricao: outros.length ? `Também participam: ${outros.map((o) => [o.nome, o.email, o.telefone].filter(Boolean).join(" · ")).join("; ")}` : null,
      convidadoNome: p.nome, convidadoEmail: p.email || null, convidadoTel: p.telefone || null,
    });
  }
  const quando = inicio.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const email = participantes.find((p) => p.email)?.email;
  return `📅 Reunião marcada${a ? ` (*${tituloArea(a)}*)` : ""}: ${quando}. Está no calendário${email ? ` e o convite vai para ${email}` : ""}.`;
}

/* ---------------- documentos ---------------- */

const DOCS_SOLTOS_H = 24;
const tamanho = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

/** "São do Rogério": os documentos sem dono vão para a área; sem nenhum solto, os próximos vão para ela */
async function documentosDaArea(a: { id: string; projectId: string | null; cidade: string; dono: string | null; corretor: string | null; nome: string }, docIds: string[], g: Grupo) {
  const soltos = await db.projectDocument.findMany({
    where: {
      deletedAt: null, areaId: null, projectId: null,
      ...(docIds.length ? { id: { in: docIds } } : { grupo: g.name, createdAt: { gt: new Date(Date.now() - DOCS_SOLTOS_H * 3600e3) } }),
    },
    select: { id: true, titulo: true, tipo: true },
  });
  const titulo = tituloArea(a);
  if (!soltos.length) return `Pode mandar! O que chegar agora guardo na área *${titulo}* › Documentos.`;
  await db.projectDocument.updateMany({ where: { id: { in: soltos.map((d) => d.id) } }, data: { areaId: a.id, ...(a.projectId ? { projectId: a.projectId } : {}), avisadoEm: new Date() } });
  for (const d of soltos) await marcarRecebido(a.id, d.tipo);
  return `Pronto! Guardei na área *${titulo}* › Documentos:\n${soltos.map((d) => `📄 ${d.titulo}`).join("\n")}`;
}

/**
 * Arquivos no Central (pedido 25/11/2026): uma resposta só para o lote. Cada arquivo espera um pouco; quem foi
 * guardado por último responde por todos os que ainda não entraram numa resposta. Sem dono, pergunta de quem são.
 */
export async function responderLoteDocumentos(g: Grupo, docId: string, responder: Responder) {
  await new Promise((r) => setTimeout(r, ESPERA_LOTE_MS));
  const meu = await db.projectDocument.findUnique({ where: { id: docId }, select: { createdAt: true } });
  if (!meu) return;
  if (await db.projectDocument.count({ where: { grupo: g.name, origem: "whatsapp", createdAt: { gt: meu.createdAt } } })) return;
  const lote = await db.projectDocument.findMany({
    where: { grupo: g.name, origem: "whatsapp", avisadoEm: null, deletedAt: null, createdAt: { gt: new Date(Date.now() - 30 * 60e3) } },
    orderBy: { createdAt: "asc" },
    select: { id: true, titulo: true, fileName: true, size: true, resumo: true, areaId: true, projectId: true },
  });
  if (!lote.length) return;
  const marcados = await db.projectDocument.updateMany({ where: { id: { in: lote.map((d) => d.id) }, avisadoEm: null }, data: { avisadoEm: new Date() } });
  if (marcados.count < lote.length) return; // outro arquivo do lote já respondeu
  const linha = (d: (typeof lote)[number]) => `📄 ${d.titulo} (${d.fileName}, ${tamanho(d.size)})${d.resumo ? `\n   _${d.resumo.slice(0, 160)}_` : ""}`;
  const partes: string[] = [];
  const porArea = new Map<string, typeof lote>();
  for (const d of lote.filter((x) => x.areaId)) porArea.set(d.areaId!, [...(porArea.get(d.areaId!) ?? []), d]);
  for (const [areaId, docs] of porArea) {
    const a = await db.area.findUnique({ where: { id: areaId }, select: { cidade: true, dono: true, corretor: true, nome: true } });
    partes.push(`📍 Área *${a ? tituloArea(a) : "?"}* › Documentos\n${docs.map(linha).join("\n")}`);
  }
  const deProjeto = lote.filter((x) => !x.areaId && x.projectId);
  for (const pid of [...new Set(deProjeto.map((d) => d.projectId!))]) {
    const p = await db.project.findUnique({ where: { id: pid }, select: { name: true } });
    partes.push(`📁 *${p?.name ?? "?"}*\n${deProjeto.filter((d) => d.projectId === pid).map(linha).join("\n")}`);
  }
  const soltos = lote.filter((x) => !x.areaId && !x.projectId);
  if (partes.length) await responder(`Armazenado! ✅ ${lote.length - soltos.length} ${lote.length - soltos.length === 1 ? "documento" : "documentos"}\n\n${partes.join("\n\n")}`);
  if (soltos.length) {
    await salvarConversa(g.id, { passo: "docs_de_quem", docIds: soltos.map((d) => d.id) });
    await responder(`Recebi ${soltos.length === 1 ? "este documento" : `estes ${soltos.length} documentos`}:\n${soltos.map(linha).join("\n")}\n\nDe quem são? Responda com o nome do proprietário, da área ou a cidade.`);
  }
}

