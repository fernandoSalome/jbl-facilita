import { ETAPA, fasePorTexto } from "./fases";

/**
 * Leitura de documentos e mensagens. Com ANTHROPIC_API_KEY a IA lê o conteúdo do arquivo;
 * sem ela, o robô classifica pelo nome do arquivo, pela legenda e por palavras-chave.
 */

export const TIPOS: Record<string, { pasta: string; nome: string; palavras: RegExp }> = {
  matricula: { pasta: "Matrículas", nome: "Matrícula", palavras: /matricula|registro de imoveis|\bcri\b/ },
  car: { pasta: "CAR", nome: "CAR", palavras: /\bcar\b|cadastro ambiental/ },
  certidao: { pasta: "Certidões", nome: "Certidão", palavras: /certidao|certidoes|onus|negativa/ },
  iptu: { pasta: "IPTU / ITR", nome: "IPTU / ITR", palavras: /iptu|\bitr\b|ccir/ },
  proposta: { pasta: "Propostas e cartas de intenção", nome: "Proposta / carta de intenção", palavras: /carta de intencao|proposta assinada|\bproposta\b/ },
  // antes de "contrato": "contrato de compra e venda" é documento de venda
  venda: { pasta: "Vendas", nome: "Documento de venda", palavras: /compra e venda|reserva de lote|ficha cadastral|distrato|tabela de vendas/ },
  contrato: { pasta: "Contratos", nome: "Contrato", palavras: /contrato|aditivo|\bspe\b/ },
  planta: { pasta: "Plantas e projetos", nome: "Planta / projeto", palavras: /planta|projeto urbanistico|levantamento|topograf|memorial|\bkmz\b|\bdwg\b/ },
  procuracao: { pasta: "Procurações", nome: "Procuração", palavras: /procuracao/ },
  pessoal: { pasta: "Documentos pessoais", nome: "Documento pessoal", palavras: /\brg\b|\bcpf\b|\bcnh\b|identidade|casamento|nascimento/ },
  licenca: { pasta: "Licenças", nome: "Licença", palavras: /licenca|cetesb|alvara|diretriz|\bgraprohab\b/ },
  obra: { pasta: "Obras", nome: "Documento de obra", palavras: /medicao|relatorio de obra|diario de obra|\bart\b|\brrt\b|orcamento de obra|boletim/ },
  foto: { pasta: "Fotos", nome: "Foto", palavras: /\bfoto\b|\bimagem\b|drone/ },
  outro: { pasta: "Outros", nome: "Documento", palavras: /^$/ },
};

export const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function tipoPorTexto(t: string): string | null {
  const n = norm(t);
  for (const [k, v] of Object.entries(TIPOS)) if (k !== "outro" && v.palavras.test(n)) return k;
  return null;
}

type Projeto = { id: string; name: string; municipio: string; uf: string };

const PARADAS = new Set(["loteamento", "condominio", "chacreamento", "gleba", "fazenda", "sitio", "jardim", "residencial", "projeto"]);

/** Loteamento citado no texto (pelo nome ou pela cidade) */
export function projetoPorTexto(t: string, projetos: Projeto[]): Projeto | null {
  const n = ` ${norm(t).replace(/[^a-z0-9]+/g, " ")} `;
  let best: { p: Projeto; s: number } | null = null;
  for (const p of projetos) {
    const nome = norm(p.name).replace(/[^a-z0-9]+/g, " ").trim();
    let s = n.includes(` ${nome} `) ? 10 : 0;
    for (const w of nome.split(" ")) if (w.length >= 4 && !PARADAS.has(w) && n.includes(` ${w} `)) s += 2;
    const cidade = norm(p.municipio).replace(/[^a-z0-9]+/g, " ").trim();
    if (cidade && n.includes(` ${cidade} `)) s += 1;
    if (s > 0 && (!best || s > best.s)) best = { p, s };
  }
  return best?.p ?? null;
}

/* ---------------- IA (Claude) ---------------- */

const temIA = () => !!process.env.ANTHROPIC_API_KEY;

async function claude(content: unknown[], max = 800): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.IA_MODELO || "claude-sonnet-5-5", max_tokens: max, messages: [{ role: "user", content }] }),
  });
  if (!r.ok) throw new Error(`IA ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { content: { type: string; text?: string }[] };
  return j.content.map((c) => c.text ?? "").join("");
}

function json<T>(t: string): T | null {
  const m = t.match(/\{[\s\S]*\}/);
  try {
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch {
    return null;
  }
}

export type Leitura = { tipo: string; titulo: string; resumo?: string; projetoId?: string | null; fase?: string | null; dados?: Record<string, unknown> };

/** Classifica um arquivo recebido. */
export async function lerDocumento(f: { base64: string; mime: string; fileName: string; legenda: string }, projetos: Projeto[]): Promise<Leitura> {
  const pista = `${f.fileName} ${f.legenda}`;
  const fallback = (): Leitura => {
    const tipo = tipoPorTexto(pista) ?? (f.mime.startsWith("image/") ? "foto" : "outro");
    return { tipo, titulo: TIPOS[tipo].nome, projetoId: projetoPorTexto(pista, projetos)?.id ?? null };
  };
  const suportado = f.mime === "application/pdf" || /^image\/(jpeg|png|webp|gif)$/.test(f.mime);
  if (!temIA() || !suportado || f.base64.length > 30_000_000) return fallback();
  try {
    const bloco =
      f.mime === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 } }
        : { type: "image", source: { type: "base64", media_type: f.mime, data: f.base64 } };
    const lista = projetos.map((p) => `- ${p.id}: ${p.name} (${p.municipio}/${p.uf})`).join("\n");
    const t = await claude([
      bloco,
      {
        type: "text",
        text: `Você organiza documentos de loteamentos da JBL Incorporadora. Arquivo: "${f.fileName}". Legenda enviada: "${f.legenda}".
Loteamentos cadastrados:
${lista}

Responda só um JSON:
{"tipo": um de ${Object.keys(TIPOS).join("|")},
 "titulo": título curto em português (ex.: "Matrícula n.º 14.656 - CRI de Martinópolis"),
 "resumo": uma frase com o que o documento diz,
 "projetoId": id do loteamento a que o documento pertence, ou null se não der para saber,
 "fase": etapa do processo do loteamento a que o documento pertence, uma de prospeccao|proposta|parceria|aprovacao|obras|vendas, ou null se não der para saber (use a legenda se ela disser),
 "dados": {"matricula": "...", "cartorio": "...", "municipio": "...", "area": "...", "proprietarios": "..."} só com o que aparecer}`,
      },
    ]);
    const j = json<Leitura>(t);
    if (!j || !TIPOS[j.tipo]) return fallback();
    if (j.projetoId && !projetos.some((p) => p.id === j.projetoId)) j.projetoId = null;
    if (!j.projetoId) j.projetoId = projetoPorTexto(pista, projetos)?.id ?? null;
    return j;
  } catch (e) {
    console.error("lerDocumento", e);
    return fallback();
  }
}

/** Palavras de números da proposta: com uma pergunta, viram consulta às propostas */
const NUMEROS = /\b(valor|preco|lotes?|parcelas?|vgv|carteira|terrenista|percentual|porcentagem|participacao|divisao|entrada|aproveitamento|metragem|area|m2|reajuste|ipca|igpm|incc|juros|antecipacao|desagio|comissao|corretor|infraestrutura|visualiz\w*|abriu|abriram|validade|vence|expira)\b/;

export type Intencao = {
  acao: "aviso_envio" | "pedido_documento" | "pedido_proposta" | "pergunta_proposta" | "status" | "listar" | "ajuda" | "nada";
  tipo?: string | null;
  projetoId?: string | null;
  /** etapa do processo citada ("documentos da aprovação") */
  fase?: string | null;
};

/** Entende o que a pessoa escreveu no grupo de comandos. */
export async function entenderTexto(texto: string, projetos: Projeto[]): Promise<Intencao> {
  const n = norm(texto);
  const projeto = projetoPorTexto(texto, projetos)?.id ?? null;
  const tipo = tipoPorTexto(texto);
  const fase = fasePorTexto(texto);
  const pede = /\b(manda|mande|envia|envie|enviar|mandar|passa|passe|preciso|quero|traz|traga|cade|me ve|me da)\b/.test(n);
  let acao: Intencao["acao"] = "nada";
  if (/\b(estou|to|tou|vou|vamos)\b.*\b(enviando|mandando|mandar|enviar|subir)\b|\bsegue(m)?\b|\bmandei\b|\benviei\b/.test(n)) acao = "aviso_envio";
  else if (pede && /\bpropostas?\b|\bpdf\b/.test(n) && !/\?|\b(qual|quais|quanto|quantos|quantas)\b/.test(n) && !/carta de intencao|assinad/.test(n)) acao = "pedido_proposta";
  else if (pede && (tipo || fase || /documentos?|arquivos?/.test(n))) acao = "pedido_documento";
  else if (/\bpropostas?\b/.test(n) || (/\?|\b(qual|quais|quanto|quantos|quantas)\b/.test(n) && NUMEROS.test(n))) acao = "pergunta_proposta";
  else if (/como esta|status|andamento|atualiza|novidade/.test(n)) acao = "status";
  else if (/quais documentos|o que (tem|temos)|lista(r)? (os )?documentos|pasta/.test(n)) acao = "listar";
  else if (/^(ajuda|help|menu|\/ajuda|oi robo|robo)\b/.test(n)) acao = "ajuda";
  const regra: Intencao = { acao, tipo, projetoId: projeto, fase };
  if (!temIA() || acao !== "nada" || n.length < 6) return regra;
  // frase que as regras não entenderam: pergunta para a IA
  try {
    const lista = projetos.map((p) => `- ${p.id}: ${p.name} (${p.municipio}/${p.uf})`).join("\n");
    const t = await claude(
      [{
        type: "text",
        text: `Mensagem num grupo de WhatsApp onde a equipe da JBL conversa com o robô que guarda documentos dos loteamentos: "${texto}"
Loteamentos:
${lista}
Responda só um JSON: {"acao": "aviso_envio" (vai mandar um documento) | "pedido_documento" (quer receber um documento ou os documentos de uma etapa) | "pedido_proposta" (quer receber o arquivo/PDF da proposta) | "pergunta_proposta" (pergunta algo das propostas: valores, lotes, divisão, carteira, terrenista, status, link) | "status" (quer saber como está um loteamento) | "listar" (quer ver o que tem na pasta) | "ajuda" | "nada" (conversa que não é com o robô),
"tipo": um de ${Object.keys(TIPOS).join("|")} ou null, "projetoId": id ou null,
"fase": etapa citada, uma de prospeccao|proposta|parceria|aprovacao|obras|vendas, ou null}`,
      }],
      200,
    );
    const j = json<Intencao>(t);
    return j?.acao
      ? { ...j, tipo: j.tipo && TIPOS[j.tipo] ? j.tipo : tipo, projetoId: j.projetoId ?? projeto, fase: j.fase && ETAPA[j.fase] ? j.fase : fase }
      : regra;
  } catch {
    return regra;
  }
}

/** Responde uma pergunta usando só os dados fornecidos (fichas das propostas). null = sem IA ou falhou. */
export async function responderComDados(pergunta: string, dados: string): Promise<string | null> {
  if (!temIA()) return null;
  try {
    const t = await claude(
      [{
        type: "text",
        text: `Você é o assistente da JBL Incorporadora num grupo de WhatsApp da equipe. Responda à pergunta usando SÓ as fichas das propostas abaixo (números já calculados pela planilha oficial). Se a pergunta não disser qual proposta e houver mais de uma possível, responda para as mais prováveis ou pergunte qual. Se a informação não estiver nas fichas, diga que não tem esse dado na proposta. Não invente números.
Formato WhatsApp: curto e direto, *negrito* com um asterisco, sem títulos com #, sem tabelas. Valores em reais no padrão brasileiro. Inclua o link da proposta só se pedirem ou se ajudar.

Pergunta: "${pergunta}"

FICHAS:
${dados}`,
      }],
      700,
    );
    return t.trim() || null;
  } catch (e) {
    console.error("responderComDados", e);
    return null;
  }
}
