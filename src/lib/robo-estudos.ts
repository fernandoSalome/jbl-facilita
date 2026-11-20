import { areaPorTexto, distribuir, SECOES, tituloArea } from "./captacao";
import { acrescentar, areasAtivas } from "./captacao-db";
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
