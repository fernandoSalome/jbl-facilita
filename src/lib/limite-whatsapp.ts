/**
 * Limite de envio pelo WhatsApp (pedido 20/11/2026): no máximo 2 mensagens a cada 15 minutos, somando tudo o que
 * o sistema manda (robô, avisos do calendário, chat da área, resumo do Central). Passou disso, a mensagem não sai
 * e quem chamou recebe o erro (fica registrado onde já registrava).
 */
export const LIMITE_ENVIOS = 2;
/** Mensagens digitadas na tela de Conversas têm limite próprio, mais alto (pedido 20/11/2026) */
export const LIMITE_MANUAL = 20;
export const JANELA_MS = 15 * 60 * 1000;

/** Pode mandar mais uma? Recebe os horários dos envios recentes */
export function podeEnviar(envios: Date[], agora = new Date(), limite = LIMITE_ENVIOS) {
  const naJanela = envios.filter((e) => +agora - +e < JANELA_MS).sort((a, b) => +a - +b);
  if (naJanela.length < limite) return { ok: true as const };
  const libera = new Date(+naJanela[naJanela.length - limite] + JANELA_MS);
  return { ok: false as const, libera };
}

export class LimiteWhatsapp extends Error {
  constructor(libera: Date, limite = LIMITE_ENVIOS) {
    super(`Limite do WhatsApp: no máximo ${limite} mensagens a cada 15 minutos. Libera às ${libera.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}.`);
  }
}
