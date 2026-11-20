/**
 * Limite de envio pelo WhatsApp (pedido 20/11/2026): no máximo 2 mensagens a cada 15 minutos, somando tudo o que
 * o sistema manda (robô, avisos do calendário, chat da área, resumo do Central). Passou disso, a mensagem não sai
 * e quem chamou recebe o erro (fica registrado onde já registrava).
 */
export const LIMITE_ENVIOS = 2;
export const JANELA_MS = 15 * 60 * 1000;

/** Pode mandar mais uma? Recebe os horários dos envios recentes */
export function podeEnviar(envios: Date[], agora = new Date()) {
  const naJanela = envios.filter((e) => +agora - +e < JANELA_MS).sort((a, b) => +a - +b);
  if (naJanela.length < LIMITE_ENVIOS) return { ok: true as const };
  const libera = new Date(+naJanela[naJanela.length - LIMITE_ENVIOS] + JANELA_MS);
  return { ok: false as const, libera };
}

export class LimiteWhatsapp extends Error {
  constructor(libera: Date) {
    super(`Limite do WhatsApp: no máximo ${LIMITE_ENVIOS} mensagens a cada 15 minutos. Libera às ${libera.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}.`);
  }
}
