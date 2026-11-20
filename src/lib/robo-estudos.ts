import { areaPorTexto, distribuir, SECOES, tituloArea } from "./captacao";
import { acrescentar, areasAtivas } from "./captacao-db";
import { lerEstudo1, respostaCentral } from "./captacao-estudos";
import { db } from "./db";
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
  await responder(r === "sim" ? `📊 Combinado: *${tituloArea(alvo)}* segue para o mercadológico de concorrentes.` : `⏹ *${tituloArea(alvo)}* fica parada no terreno.`);
  return true;
}
