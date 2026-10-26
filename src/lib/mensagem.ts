/**
 * Mensagem de envio da proposta no WhatsApp. O texto fica no template (vale para todos os
 * tipos de loteamento e todas as propostas) com campos entre colchetes, preenchidos na hora
 * de enviar cada proposta.
 */

/** Chave do texto no template (parte compartilhada) */
export const MSG_KEY = "msg.whatsapp";

/** Campos que dá para usar no texto, com a explicação mostrada no template */
export const CAMPOS_MSG: [campo: string, explicacao: string][] = [
  ["[Saudação]", "Bom dia, Boa tarde ou Boa noite, pela hora de São Paulo"],
  ["[Nome]", "o nome escolhido em “Proposta para” (ou o proprietário)"],
  ["[Tipo de loteamento]", "ex.: Loteamento Aberto Urbano"],
  ["[Gleba]", "o nome do loteamento"],
  ["[Link]", "o link da proposta"],
];

export const MSG_PADRAO =
  "[Saudação] a todos!\n\n" +
  "[Nome], segue nossa *Proposta Técnica e Comercial* de Parceria para implantação de *[Tipo de loteamento] na Gleba [Gleba]*.\n\n" +
  "A proposta foi desenvolvida em formato *Digital Interativo*, com apresentação e conceito de *Site Personalizado*, proporcionando uma *experiência de visualização mais dinâmica e organizada*. Para melhor aproveitamento do conteúdo e dos recursos interativos, *recomendamos a visualização preferencialmente pelo computador*.\n\n" +
  "Colocamo-nos à disposição para esclarecimentos e reunião.\n\n" +
  "[Link]";

/** Bom dia das 3h às 12h, boa tarde das 12h às 18h, boa noite das 18h às 3h (hora de São Paulo) */
export function saudacao(agora = new Date()) {
  const hora = Number(agora.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" })) % 24;
  return hora >= 3 && hora < 12 ? "Bom dia" : hora >= 12 && hora < 18 ? "Boa tarde" : "Boa noite";
}

/** Texto do template (ou o padrão) com os campos preenchidos */
export function montarMensagem(
  modelo: unknown,
  v: { saudacao: string; nome: string; tipo: string; gleba: string; link: string },
) {
  const texto = typeof modelo === "string" && modelo.trim() ? modelo : MSG_PADRAO;
  const valores: Record<string, string> = {
    saudação: v.saudacao,
    saudacao: v.saudacao,
    nome: v.nome,
    "tipo de loteamento": v.tipo,
    tipo: v.tipo,
    gleba: v.gleba,
    link: v.link,
  };
  return texto.replace(/\[([^\]\n]{1,30})\]/g, (todo, campo: string) => valores[campo.trim().toLowerCase()] ?? todo);
}
