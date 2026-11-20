import { areaPorTexto, distribuir, SECOES, tituloArea } from "./captacao";
import { acrescentar, areasAtivas } from "./captacao-db";
import { lerEstudo1, respostaCentral } from "./captacao-estudos";
import { db } from "./db";
import { confirmacaoLembrete, lerPedidoLembrete, resumoArea } from "./lembretes";
import type { Recebida } from "./whatsapp";

/**
 * Grupo JBL - Estudos (pedido 19/11/2026): texto citando a área vai para o checklist dela, frase por frase,
 * com a origem. Se não der para saber a área, pergunta. Devolve false quando não é com ele (ex.: "ajuda").
 */
export async function tratarEstudos(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  const t = m.texto.trim();
  if (t.length < 8 || /^(ajuda|menu|\?)$/i.test(t)) return false;
  const areas = await areasAtivas();
  const achadas = areaPorTexto(t, areas);
  if (achadas.length !== 1) {
    const lista = (achadas.length ? achadas : areas).slice(0, 10).map((a, i) => `${i + 1}. ${tituloArea(a)}`).join("\n");
    await responder(areas.length ? `🤔 De qual área é? Mande de novo citando o nome:\n${lista}` : "Ainda não há áreas cadastradas na Captação.");
    return true;
  }
  const a = achadas[0];
  const dia = m.quando.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const novas = distribuir(t, "whatsapp", `${m.autor || "grupo Estudos"} · ${dia}`);
  await acrescentar(a.id, novas);
  const linhas = novas.map((r) => `• ${r.secao + 1}. ${SECOES[r.secao].titulo}: ${r.resposta.slice(0, 80)}`).join("\n");
  await responder(`✅ Anotei em *${tituloArea(a)}*:\n${linhas}`);
  return true;
}

/**
 * Grupo JBL - Central: depois do resumo do terreno, "1"/"sim" libera o mercadológico e "2"/"não" para no terreno.
 * Vale para a área perguntada nas últimas 48 h (a citada na mensagem, se houver mais de uma).
 */
export async function tratarCentral(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  const r = respostaCentral(m.texto);
  if (!r) return false;
  // KMZ esperando confirmação neste grupo (o mais recente, até 48 h): "1" põe a pré-pesquisa na fila
  const pend = await db.comandoClaude.findFirst({ where: { grupoJid: m.grupo, status: "confirmar", createdAt: { gt: new Date(Date.now() - 48 * 3600e3) } }, orderBy: { createdAt: "desc" } });
  if (pend) {
    await db.comandoClaude.update({ where: { id: pend.id }, data: { status: r === "sim" ? "fila" : "cancelado" } });
    const naFila = await db.comandoClaude.count({ where: { status: { in: ["fila", "rodando"] }, id: { not: pend.id } } });
    await responder(r === "sim" ? `🧠 Combinado. Começo a Viabilidade Legal (leva de 20 a 60 minutos)${naFila ? `; tem ${naFila} pedido(s) antes` : ""}. Respondo aqui.` : "Ok, não faço a pré-pesquisa. A área fica em Projetos.");
    return true;
  }
  const desde = Date.now() - 48 * 3600e3;
  const perguntadas = (await db.area.findMany({ where: { deletedAt: null, situacao: "ativa", etapa: "previabilidade" } })).filter((a) => {
    const e = lerEstudo1(a.estudo1);
    return e.status === "perguntado" && e.perguntadoEm && +new Date(e.perguntadoEm) > desde;
  });
  const citadas = areaPorTexto(m.texto, perguntadas);
  const alvo = citadas.length === 1 ? citadas[0] : perguntadas.length === 1 ? perguntadas[0] : null;
  if (!alvo) {
    if (perguntadas.length > 1) {
      await responder(`De qual área? Responda com o nome:\n${perguntadas.map((a) => `• ${tituloArea(a)}`).join("\n")}`);
      return true;
    }
    return false;
  }
  await db.area.update({ where: { id: alvo.id }, data: { estudo1: { ...lerEstudo1(alvo.estudo1), status: r } } });
  // "sim": o Claude da VPS já faz a Viabilidade Mercadológica
  if (r === "sim") await db.comandoClaude.create({ data: { texto: `Viabilidade Mercadológica de ${tituloArea(alvo)}`, grupoJid: m.grupo, autor: m.autor || null, tipo: "mercado", areaId: alvo.id } });
  await responder(r === "sim" ? `📊 Combinado: *${tituloArea(alvo)}* segue para a Viabilidade Mercadológica. Já comecei (leva de 20 a 40 minutos); respondo aqui.` : `⏹ *${tituloArea(alvo)}* fica parada na Viabilidade Legal.`);
  return true;
}

/** "me lembra amanhã às 9h de…": guarda e confirma; sai no mesmo grupo na hora (pedido 20/11/2026) */
export async function tratarLembrete(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  const p = lerPedidoLembrete(m.texto, m.quando);
  if (!p) return false;
  await db.lembrete.create({ data: { texto: p.texto.slice(0, 400), quando: p.quando, grupoJid: m.grupo, pedidoPor: m.autor || null } });
  await responder(confirmacaoLembrete(p.quando, p.texto));
  return true;
}

/** "Qual a situação de Sorocaba?" / "como está o Sítio do Pedro": o resumo da área (pedido 20/11/2026) */
export async function tratarSituacaoArea(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  const n = m.texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!/situac|como esta|status|andamento|resumo|novidade/.test(n)) return false;
  const areas = await db.area.findMany({ where: { deletedAt: null, situacao: { not: "descartada" } } });
  const achadas = areaPorTexto(m.texto, areas);
  if (!achadas.length) return false;
  if (achadas.length > 1) {
    await responder(`Qual delas?\n${achadas.slice(0, 8).map((a) => `• ${tituloArea(a)}`).join("\n")}`);
    return true;
  }
  await responder(resumoArea(achadas[0]));
  return true;
}

/**
 * Grupo JBL - Claude (pedido 20/11/2026): o pedido entra na fila do Claude da VPS, que pesquisa com a
 * assinatura e responde no grupo. Só o próprio WhatsApp e os números em CLAUDE_AUTORIZADOS; os outros são ignorados.
 */
export async function pedirAoClaude(m: Recebida, responder: (t: string) => Promise<unknown>) {
  const { autorizado, tipoDoPedido } = await import("./claude-ponte");
  if (!autorizado(m) || m.texto.trim().length < 3) return;
  const tipo = tipoDoPedido(m.texto);
  let areaId: string | null = null;
  if (tipo !== "pesquisa") {
    // estudo e mercado são de uma área da Captação: precisa saber qual
    const areas = await db.area.findMany({ where: { deletedAt: null, situacao: { not: "descartada" } } });
    const achadas = areaPorTexto(m.texto, areas);
    if (achadas.length !== 1) {
      const lista = (achadas.length ? achadas : areas).slice(0, 10).map((a) => `• ${tituloArea(a)}`).join("\n");
      return void (await responder(`De qual área? Mande de novo com o nome:\n${lista}`));
    }
    const a = achadas[0];
    if (!a.poligono) return void (await responder(`*${tituloArea(a)}* ainda não tem o KMZ. Suba o arquivo em Configurações da área e peça de novo.`));
    areaId = a.id;
  }
  const naFila = await db.comandoClaude.count({ where: { status: { in: ["fila", "rodando"] } } });
  await db.comandoClaude.create({ data: { texto: m.texto.slice(0, 4000), grupoJid: m.grupo, autor: m.autor || null, tipo, areaId } });
  const oque = tipo === "estudo" ? "a Viabilidade Legal (leva de 20 a 60 minutos)" : tipo === "mercado" ? "a Viabilidade Mercadológica (leva de 20 a 40 minutos)" : "a pesquisa";
  await responder(`🧠 Recebi. Vou fazer ${oque}.${naFila ? ` Tem ${naFila} pedido(s) antes.` : ""} Respondo aqui quando terminar.`);
}


/**
 * KMZ mandado no JBL - Central (pedido 20/11/2026): a área entra em Projetos (mapa, tamanho, cidade) e o robô
 * pergunta se faz a pré-pesquisa. "1" põe a Viabilidade Legal na fila do Claude da VPS (assinatura).
 */
export async function tratarKmzCentral(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  if (!m.arquivo || !/\.km[lz]$/i.test(m.arquivo.fileName)) return false;
  const { autorizado } = await import("./claude-ponte");
  if (!autorizado(m)) return true;
  const { baixarMidia } = await import("./whatsapp");
  const { centro, cidadeDoPonto, hectares, kmlDoKmz, lerKml } = await import("./kml");
  const midia = await baixarMidia(m.id);
  const buf = Buffer.from(midia.base64, "base64");
  if (buf.length > 5 * 1024 * 1024) {
    await responder("Esse KMZ passa de 5 MB. Pode mandar um menor?");
    return true;
  }
  const xml = /\.kmz$/i.test(m.arquivo.fileName) ? kmlDoKmz(buf) : buf.toString("utf8");
  const poligono = xml ? lerKml(xml) : null;
  if (!poligono) {
    await responder("Não achei um polígono nesse arquivo. Confere se é o KMZ da área?");
    return true;
  }
  const [lon, lat] = centro(poligono);
  const lugar = await cidadeDoPonto(lon, lat);
  const nome = (m.texto || m.arquivo.fileName.replace(/\.km[lz]$/i, "")).slice(0, 120);
  const ha = hectares(poligono);
  const a = await db.area.create({
    data: { nome, cidade: lugar?.cidade ?? "A definir", uf: lugar?.uf ?? "SP", hectares: ha, poligono, documentos: { "KMZ da área": "ok" } },
  });
  await db.comandoClaude.create({ data: { texto: `Pré-pesquisa (Viabilidade Legal) do KMZ ${nome}`, grupoJid: m.grupo, autor: m.autor || null, tipo: "estudo", areaId: a.id, status: "confirmar" } });
  const onde = lugar ? `${lugar.cidade}/${lugar.uf}` : "cidade a confirmar";
  await responder(`📍 Recebi o KMZ *${nome}* (${onde}, ${ha.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha). Já está em Projetos.\n\nFaço a pré-pesquisa (Viabilidade Legal)?\n1 Sim · 2 Não`);
  return true;
}
