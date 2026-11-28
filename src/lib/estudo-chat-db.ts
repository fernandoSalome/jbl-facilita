import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { conversaMd, estudoDoChat, imagensDo, lerPedidoChat, promptChat, relatorioDoChat, textoDoPedido, type EstudoChat } from "./estudo-chat";
import { relatorioGravado, semNomes } from "./relatorio";

/** Chat ao lado do estudo (pedido 27/11/2026). Regras em estudo-chat.ts; aqui o banco e a fila da VPS. */

const campoRelatorio = (e: EstudoChat) => (e === "estudo" ? "relatorioCompleto" : "relatorioMercado");
const campoEstudo = (e: EstudoChat) => (e === "estudo" ? "estudo1" : "estudo2");

/** pedido do chat desta área e deste estudo ainda na fila ou rodando na VPS */
async function pedidoAberto(areaId: string, estudo: EstudoChat) {
  return db.comandoClaude.findFirst({ where: { tipo: "chat", areaId, status: { in: ["fila", "rodando"] }, texto: { contains: `"estudo":"${estudo}"` } }, select: { id: true, status: true } });
}

export async function conversaDoEstudo(areaId: string, estudo: EstudoChat) {
  const [mensagens, aberto] = await Promise.all([
    db.estudoMensagem.findMany({ where: { areaId, estudo }, orderBy: { createdAt: "asc" }, take: 300 }),
    pedidoAberto(areaId, estudo),
  ]);
  return {
    mensagens: mensagens.map((m) => ({ id: m.id, papel: m.papel, autor: m.autor, texto: m.texto, proposta: m.proposta, inclusao: m.inclusao, em: m.createdAt.toISOString() })),
    esperando: aberto ? aberto.status : null,
  };
}

async function areaComEstudo(areaId: string, estudo: EstudoChat) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { id: true, relatorioCompleto: true, relatorioMercado: true } });
  if (!a) throw new Error("Área não encontrada");
  if (!relatorioGravado(a[campoRelatorio(estudo)])) throw new Error("Esta área ainda não tem esse estudo completo");
}

/** Pergunta da equipe: vai para a fila do Claude da VPS (vagas rápidas) */
export async function perguntarAoEstudo(areaId: string, estudo: EstudoChat, texto: string, autor: string) {
  await areaComEstudo(areaId, estudo);
  if (await pedidoAberto(areaId, estudo)) throw new Error("Espere a resposta anterior chegar");
  const m = await db.estudoMensagem.create({ data: { areaId, estudo, papel: "eu", autor, texto } });
  const c = await db.comandoClaude.create({ data: { tipo: "chat", areaId, grupoJid: "", autor, texto: textoDoPedido({ modo: "pergunta", estudo, mensagemId: m.id }) } });
  await db.estudoMensagem.update({ where: { id: m.id }, data: { comandoId: c.id } });
}

/** "Inclui na pesquisa?" Não: fica só na conversa. Sim: o Claude aplica no estudo. */
export async function responderInclusao(areaId: string, estudo: EstudoChat, mensagemId: string, sim: boolean, autor: string) {
  const m = await db.estudoMensagem.findFirst({ where: { id: mensagemId, areaId, estudo, papel: "claude", inclusao: null } });
  if (!m) throw new Error("Essa resposta já foi respondida");
  if (!sim) {
    await db.estudoMensagem.update({ where: { id: m.id }, data: { inclusao: "nao" } });
    return;
  }
  await areaComEstudo(areaId, estudo);
  if (await pedidoAberto(areaId, estudo)) throw new Error("Espere a resposta anterior chegar");
  const c = await db.comandoClaude.create({ data: { tipo: "chat", areaId, grupoJid: "", autor, texto: textoDoPedido({ modo: "incluir", estudo, mensagemId: m.id }) } });
  await db.estudoMensagem.update({ where: { id: m.id }, data: { inclusao: "sim", comandoId: c.id } });
}

/** O que a VPS recebe: as instruções e os arquivos da pasta do chat (~/estudos/chat/<área>-<estudo>) */
export async function pedidoDoChat(c: { id: string; texto: string; areaId: string | null }) {
  const p = lerPedidoChat(c.texto);
  if (!p || !c.areaId) return null;
  const [a, msgs, alvo, original] = await Promise.all([
    db.area.findFirst({ where: { id: c.areaId, deletedAt: null }, select: { id: true, nome: true, cidade: true, uf: true, hectares: true, etapa: true, estudo1: true, estudo2: true, relatorioCompleto: true, relatorioMercado: true } }),
    db.estudoMensagem.findMany({ where: { areaId: c.areaId, estudo: p.estudo }, orderBy: { createdAt: "asc" }, take: 300 }),
    db.estudoMensagem.findUnique({ where: { id: p.mensagemId } }),
    db.comandoClaude.findFirst({ where: { tipo: p.estudo, areaId: c.areaId, status: "feito" }, orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  if (!a || !alvo) return null;
  const pasta = `chat/${a.id}-${p.estudo}`;
  return {
    id: c.id,
    tipo: "chat",
    modo: p.modo,
    pasta,
    texto: promptChat({ modo: p.modo, estudo: p.estudo, pasta, pastaEstudo: original ? `trabalho/${original.id}` : null, pergunta: alvo.texto, proposta: alvo.proposta }),
    arquivos: {
      "area.json": JSON.stringify({ nome: a.nome, cidade: a.cidade, uf: a.uf, hectares: a.hectares, etapa: a.etapa, outroEstudo: p.estudo === "estudo" ? a.estudo2 : a.estudo1 }, null, 1),
      "estudo.json": JSON.stringify(a[campoEstudo(p.estudo)], null, 1),
      "relatorio.json": JSON.stringify(a[campoRelatorio(p.estudo)], null, 1),
      "conversa.md": conversaMd(msgs),
    },
  };
}

/** Resposta da VPS: vira mensagem do chat; no "incluir", grava o estudo novo na área */
export async function respostaDoChat(c: { id: string; texto: string; areaId: string | null }, b: { ok?: unknown; resposta?: unknown; proposta?: unknown; relatorio?: unknown; estudo?: unknown }) {
  const p = lerPedidoChat(c.texto);
  if (!p || !c.areaId) return;
  const areaId = c.areaId;
  const resposta = typeof b.resposta === "string" ? b.resposta.trim().slice(0, 20_000) : "";
  const nova = (texto: string, proposta: string | null = null, inclusao: string | null = null) =>
    db.estudoMensagem.create({ data: { areaId, estudo: p.estudo, papel: "claude", texto, proposta, inclusao, comandoId: c.id } });
  if (b.ok === false) {
    if (p.modo === "incluir") await db.estudoMensagem.update({ where: { id: p.mensagemId }, data: { inclusao: "erro" } }).catch(() => {});
    await nova(`⚠️ Não consegui ${p.modo === "incluir" ? "incluir no estudo" : "responder"} agora. ${resposta.slice(0, 400)}`.trim(), null, "nao");
    return;
  }
  if (p.modo === "pergunta") {
    const proposta = typeof b.proposta === "string" ? b.proposta.trim().slice(0, 2000) : "";
    await nova(resposta || "(sem resposta)", proposta || null);
    return;
  }
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { dono: true, corretor: true, estudo1: true, estudo2: true, relatorioCompleto: true, relatorioMercado: true } });
  const antes = relatorioGravado(a?.[campoRelatorio(p.estudo)]);
  const rel = relatorioDoChat(b.relatorio, imagensDo(antes));
  if (!a || !rel) {
    await db.estudoMensagem.update({ where: { id: p.mensagemId }, data: { inclusao: "erro" } }).catch(() => {});
    await nova("⚠️ Não consegui incluir no estudo: o estudo novo voltou fora do formato. Nada foi mudado.", null, "nao");
    return;
  }
  // nomes do proprietário e do corretor não vão para o link do parceiro (como no estudo da VPS)
  const relatorio = semNomes(rel, [a.dono ?? "", a.corretor ?? ""]);
  await db.area.update({
    where: { id: areaId },
    data: {
      [campoRelatorio(p.estudo)]: relatorio as unknown as Prisma.InputJsonValue,
      ...(b.estudo && typeof b.estudo === "object" ? { [campoEstudo(p.estudo)]: estudoDoChat(p.estudo, a[campoEstudo(p.estudo)], b.estudo) as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  await db.estudoMensagem.update({ where: { id: p.mensagemId }, data: { inclusao: "feito" } }).catch(() => {});
  await nova(`✅ Incluído no estudo.${resposta ? `\n\n${resposta}` : ""}`, null, "nao");
}
