/**
 * Para que serve cada grupo de WhatsApp (pedido 19/11/2026). O robô continua guardando documentos em
 * todos os grupos cadastrados; a função só acrescenta o comportamento do tipo.
 */
export const FUNCOES = {
  avisos: {
    nome: "JBL - Avisos",
    resumo: "Só o robô posta: reunião marcada, cancelada, 1 dia antes e 1 hora antes.",
    regras: ["Avisos do calendário (marcada, cancelada, lembretes)", "Ninguém precisa responder"],
  },
  central: {
    nome: "JBL - Central",
    resumo: "Comandos e decisões: o robô pergunta se a área avança de etapa e manda o resumo da manhã.",
    regras: ["Pedidos de documento e proposta (como hoje)", "Perguntas de avanço de etapa", "Resumo do dia"],
  },
  estudos: {
    nome: "JBL - Estudos",
    resumo: "Texto sobre uma área (com o nome dela) vai para o checklist. Se não souber de qual área é, o robô pergunta.",
    regras: ["Cite a área: “Sítio do Pedro: a estrada é de terra”", "Cada frase vai para a seção certa, com a origem", "Na dúvida, o robô pergunta de qual área é"],
  },
  projeto: {
    nome: "Grupo do projeto",
    resumo: "Grupo de um loteamento específico: documentos vão direto para a pasta dele.",
    regras: ["Documentos e pedidos sobre o loteamento"],
  },
} as const;
export type Funcao = keyof typeof FUNCOES;
export const ehFuncao = (f: unknown): f is Funcao => typeof f === "string" && f in FUNCOES;
