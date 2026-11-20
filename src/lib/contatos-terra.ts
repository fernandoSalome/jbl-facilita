/**
 * Contatos de terra (pedido 20/11/2026): conversas particulares do WhatsApp que falam de terra (terrenista,
 * corretor com área) aparecem em Conversas, mesmo sem área ligada. Quem decide é o Claude da VPS, lendo o
 * contexto da conversa; aqui ficam o pedido que vai para ele e a leitura da resposta (funções puras).
 */

export type ConversaParaLer = { telefone: string; nome: string | null; mensagens: { deMim: boolean; texto: string }[] };
/** terra: null = ainda não dá para saber (conversa curta); fica pendente e é lida de novo quando chegar mais */
export type Classificacao = { telefone: string; terra: boolean | null; papel: "proprietario" | "corretor" | "outro"; resumo: string; nome: string | null };

/** Quantas conversas vão por pedido e quanto de cada uma (o Claude lê rápido e cabe numa rodada) */
export const POR_PEDIDO = 25;
const MSGS_POR_CONVERSA = 30;
const MAX_TEXTO = 400;

export function pedidoClassificacao(cs: ConversaParaLer[]) {
  const blocos = cs.map((c, i) => {
    const linhas = c.mensagens.slice(-MSGS_POR_CONVERSA).map((m) => `${m.deMim ? "Fernando" : "Contato"}: ${m.texto.replace(/\s+/g, " ").slice(0, MAX_TEXTO)}`);
    return `### Conversa ${i + 1} · telefone ${c.telefone}${c.nome ? ` · nome no WhatsApp: ${c.nome}` : ""}\n${linhas.join("\n")}`;
  });
  return `Você ajuda a JBL Incorporadora (loteamentos), do Fernando. Abaixo estão conversas particulares do WhatsApp dele.
Para cada uma, decida pelo CONTEXTO se a conversa é sobre terra para negócio: alguém oferecendo ou procurando
gleba, área, terreno, fazenda, sítio para loteamento ou parceria; proprietário (terrenista) ou corretor com área;
pedido de matrícula, KMZ, localização, preço de área, visita a terreno. Família, amigos, fornecedores, clientes de
outro assunto, cobranças e propagandas NÃO são de terra. Na dúvida, se houver qualquer sinal de negócio com terra, é de terra.

Responda SÓ com um JSON (sem texto antes ou depois), uma lista com um item por conversa:
[{"telefone":"5511...","terra":true ou false ou null (null = conversa curta demais, ainda não dá para saber),"papel":"proprietario|corretor|outro","resumo":"1 frase: quem é e que área (cidade, tamanho) se der","nome":"nome da pessoa se aparecer na conversa, senão null"}]
Não invente dado que não está na conversa. Não use ferramentas.

${blocos.join("\n\n")}`;
}

/** Lê a resposta do Claude; ignora item mal formado ou de telefone que não foi pedido */
export function lerClassificacao(texto: string, pedidos: string[]): Classificacao[] {
  const ini = texto.indexOf("[");
  const fim = texto.lastIndexOf("]");
  if (ini < 0 || fim <= ini) return [];
  let lista: unknown;
  try {
    lista = JSON.parse(texto.slice(ini, fim + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(lista)) return [];
  const validos = new Set(pedidos);
  const vistos = new Set<string>();
  const out: Classificacao[] = [];
  for (const x of lista) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const telefone = String(o.telefone ?? "").replace(/\D/g, "");
    if (!validos.has(telefone) || vistos.has(telefone) || !(typeof o.terra === "boolean" || o.terra === null)) continue;
    vistos.add(telefone);
    const papel = o.papel === "proprietario" || o.papel === "corretor" ? o.papel : "outro";
    const nome = typeof o.nome === "string" && o.nome.trim() && o.nome !== "null" ? o.nome.trim().slice(0, 80) : null;
    out.push({ telefone, terra: o.terra as boolean | null, papel, resumo: typeof o.resumo === "string" ? o.resumo.trim().slice(0, 300) : "", nome });
  }
  return out;
}

/** Conversa particular de pessoa (não grupo, não status, não lista de transmissão) */
export const ehParticular = (jid: string) => /^\d{10,15}@s\.whatsapp\.net$/.test(jid);
