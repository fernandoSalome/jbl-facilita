/**
 * Limite de envio pelo WhatsApp. Pedido 22/11/2026: no máximo 1 mensagem a cada 10 minutos, somando tudo o que o
 * sistema manda (robô, avisos do calendário, chat da área, resumo do Central). Antes eram 2 a cada 15 minutos.
 * Texto que passa do limite não se perde: espera a vez na fila (MensagemEspera) e sai na próxima vaga.
 */
export const LIMITE_ENVIOS = 1;
export const JANELA_MS = 10 * 60 * 1000;
/** Mensagens digitadas na tela de Conversas têm limite próprio, mais alto (pedido 20/11/2026) */
export const LIMITE_MANUAL = 20;
export const JANELA_MANUAL_MS = 15 * 60 * 1000;

/** Pode mandar mais uma? Recebe os horários dos envios recentes */
export function podeEnviar(envios: Date[], agora = new Date(), limite = LIMITE_ENVIOS, janela = JANELA_MS) {
  const naJanela = envios.filter((e) => +agora - +e < janela).sort((a, b) => +a - +b);
  if (naJanela.length < limite) return { ok: true as const };
  const libera = new Date(+naJanela[naJanela.length - limite] + janela);
  return { ok: false as const, libera };
}

export class LimiteWhatsapp extends Error {
  constructor(libera: Date, limite = LIMITE_ENVIOS, janela = JANELA_MS) {
    const quanto = limite === 1 ? "1 mensagem" : `${limite} mensagens`;
    super(`Limite do WhatsApp: no máximo ${quanto} a cada ${janela / 60_000} minutos. Libera às ${libera.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}.`);
  }
}
