import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cortarResposta, senhaValida } from "@/lib/claude-ponte";
import { enviarDaEspera, enviarTexto } from "@/lib/whatsapp";
import { avisarComeco, avisarFim } from "@/lib/estudo-andamento-db";
import { confirmarParada, descartarVencidos } from "@/lib/estudo-parar-db";
import { guardarEstudoDaVps } from "@/lib/captacao-db";
import { guardarClassificacao, montarClassificacao, pedirClassificacao } from "@/lib/contatos-terra-db";

export const dynamic = "force-dynamic";

/**
 * Fila do Claude da VPS (pedido 20/11/2026). Rota pública só para a VPS: confere a senha (CLAUDE_PONTE_SECRET)
 * antes de tudo. GET pega o próximo pedido; POST devolve a resposta, que vai para o grupo.
 */
export async function GET(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  // pedido que ficou "rodando" além do tempo limite da VPS (ela caiu): volta para a fila. Estudo pode levar 90 min.
  await db.comandoClaude.updateMany({ where: { status: "rodando", tipo: { notIn: ["estudo", "mercado"] }, iniciadoEm: { lt: new Date(Date.now() - 40 * 60e3) } }, data: { status: "fila", progresso: null, fase: null } });
  await db.comandoClaude.updateMany({ where: { status: "rodando", tipo: { in: ["estudo", "mercado"] }, iniciadoEm: { lt: new Date(Date.now() - 100 * 60e3) } }, data: { status: "fila", progresso: null, fase: null } });
  // estudo parado há mais de 5 dias sem retomar: descartado (pedido 23/11/2026)
  await descartarVencidos().catch(() => {});
  // mensagem que esperava a vez por causa do limite de envio (pedido 22/11/2026)
  await enviarDaEspera().catch(() => {});
  // a VPS pergunta a cada 30 s: aproveita para pôr na fila a leitura das conversas que pararam
  await pedirClassificacao().catch(() => {});
  // e o aviso de geladeira (a rotina de 10 em 10 minutos falha às vezes)
  await import("@/lib/rotinas-whatsapp").then((r) => r.avisosGeladeira()).catch(() => {});
  // lembretes na hora certa (a rotina de 10 em 10 minutos atrasa) e a memória do Central com no máximo 90 dias (25/11/2026)
  await import("@/lib/rotinas-whatsapp").then((r) => r.enviarLembretes()).catch(() => {});
  await import("@/lib/central-db").then((c) => c.limparMemoria()).catch(() => {});
  // a VPS roda vários ao mesmo tempo (26/11/2026); com as vagas de estudo cheias, pede só os rápidos, e vice-versa
  const so = new URL(req.url).searchParams.get("so");
  const tipo = so === "rapidos" ? { notIn: ["estudo", "mercado"] } : so === "estudos" ? { in: ["estudo", "mercado"] } : undefined;
  const c = await db.comandoClaude.findFirst({ where: { status: "fila", ...(tipo ? { tipo } : {}) }, orderBy: { createdAt: "asc" } });
  if (!c) return json({ vazio: true });
  const pego = await db.comandoClaude.updateMany({ where: { id: c.id, status: "fila" }, data: { status: "rodando", iniciadoEm: new Date() } });
  if (!pego.count) return json({ vazio: true });
  // leitura das conversas particulares: o texto é montado agora, com as conversas paradas (pedido 20/11/2026)
  if (c.tipo === "classificar") {
    const texto = await montarClassificacao(c.id);
    if (texto) return json({ id: c.id, texto, autor: null, tipo: c.tipo, area: null });
    await db.comandoClaude.update({ where: { id: c.id }, data: { status: "feito", resposta: "(nada para ler)", terminadoEm: new Date(), enviadoEm: new Date() } });
    return json({ vazio: true });
  }
  // "Comecei a análise da gleba X" no JBL - Avisos (pedido 22/11/2026); falha no aviso não segura o estudo
  await avisarComeco(c).catch((e) => console.error("aviso começo", e));
  // estudo e mercado: vão junto os dados da área (KMZ e o que os estudos já definiram)
  const area = c.areaId
    ? await db.area.findFirst({ where: { id: c.areaId }, select: { id: true, nome: true, cidade: true, uf: true, hectares: true, poligono: true, estudo1: true, estudo2: true } })
    : null;
  return json({ id: c.id, texto: c.texto, autor: c.autor, tipo: c.tipo, area });
}

export async function POST(req: Request) {
  if (!senhaValida(req.headers.get("authorization"))) return json({ error: "Não autorizado" }, 401);
  const b = await req.json().catch(() => ({}));
  const id = typeof b.id === "string" ? b.id.slice(0, 40) : "";
  const resposta = typeof b.resposta === "string" ? b.resposta.slice(0, 50_000) : "";
  // a VPS parou o estudo a pedido e guardou a pasta: confirma no grupo (pedido 23/11/2026)
  if (b.parado === true) {
    await confirmarParada(id);
    return json({ ok: true });
  }
  const c = await db.comandoClaude.findFirst({ where: { id, status: "rodando" } });
  if (!c) return json({ error: "Pedido não encontrado" }, 404);
  // leitura das conversas: não vai para grupo nenhum
  if (c.tipo === "classificar") {
    await db.comandoClaude.update({ where: { id }, data: { status: b.ok === false ? "erro" : "feito", resposta: resposta.slice(0, 20_000), terminadoEm: new Date(), enviadoEm: new Date() } });
    if (b.ok !== false) await guardarClassificacao(c.texto, resposta);
    return json({ ok: true });
  }
  // estudo pronto: a área recebe a viabilidade (campos do formulário e o estudo completo)
  let aviso = "";
  if (b.ok !== false && c.areaId && (c.tipo === "estudo" || c.tipo === "mercado")) {
    try {
      aviso = await guardarEstudoDaVps(c.areaId, c.tipo, b.estudo, typeof b.relatorioHtml === "string" ? b.relatorioHtml : "");
    } catch (e) {
      aviso = `\n\n⚠️ O estudo não entrou na plataforma: ${(e as Error).message.slice(0, 200)}`;
    }
  }
  await db.comandoClaude.update({ where: { id }, data: { status: b.ok === false ? "erro" : "feito", resposta: (resposta || "(sem resposta)") + aviso, terminadoEm: new Date(), ...(b.ok === false ? {} : { progresso: 100 }) } });
  // manda já; se o limite de envio barrar, a rotina de 10 em 10 minutos tenta de novo
  try {
    await enviarTexto(c.grupoJid, `🤖 🧠 ${cortarResposta((resposta || "Não consegui responder agora.") + aviso)}`); // 🤖: o robô não lê de volta
    await db.comandoClaude.update({ where: { id }, data: { enviadoEm: new Date() } });
  } catch {}
  // "pronto, o resumo está no Central" no JBL - Avisos; sai depois do resumo, na vez dele
  await avisarFim(c, b.ok !== false && !aviso.includes("não entrou")).catch((e) => console.error("aviso fim", e));
  return json({ ok: true });
}
