/**
 * Conversa no JBL - Central (pedido 25/11/2026): "como está o terreno do Rogério?" → o robô acha a área (ou pergunta
 * qual), mostra a etapa e pergunta o que fazer; avançar, estudo, proposta e reunião só depois de "sim". Lembrete sai
 * direto. A IA só diz o que a pessoa pediu (lerPedido); quem decide e executa é o código, aqui e em central-db.ts.
 */
import { nomeEtapa, proximaEtapa } from "./captacao";

export const ACOES = ["status", "avancar", "estudo", "proposta", "lembrete", "reuniao"] as const;
export type Acao = (typeof ACOES)[number];
const OUTROS = ["sim", "nao", "opcao", "documentos_de", "nada"] as const;

export type Participante = { nome: string; email: string; telefone: string };
export type Pedido = {
  acao: Acao | (typeof OUTROS)[number];
  /** área escolhida pela IA na lista (ou null) */
  areaId: string | null;
  /** quando a IA ficou em dúvida entre algumas áreas */
  candidatos: string[];
  /** "1", "2"… de uma lista que o robô mandou */
  opcao: number | null;
  /** data e hora (lembrete e reunião) */
  quando: Date | null;
  texto: string;
  /** lembrete no JBL - Avisos em vez do Central */
  avisos: boolean;
  participantes: Participante[];
  local: string;
};

export type Conversa =
  | { passo: "qual_area"; acao: Acao | null; candidatos: string[]; dados?: Dados }
  | { passo: "o_que_fazer"; areaId: string }
  | { passo: "confirmar"; acao: Acao; areaId: string | null; dados?: Dados }
  | { passo: "docs_de_quem"; docIds: string[]; candidatos?: string[] };

/** O que vai junto da ação (lembrete e reunião), em texto para caber no JSON da conversa */
export type Dados = { quando?: string; texto?: string; avisos?: boolean; participantes?: Participante[]; local?: string };

export type AreaNaLista = { id: string; titulo: string; etapa: string };

export type Decisao =
  | { tipo: "responder"; texto: string; conversa: Conversa | null }
  | { tipo: "executar"; acao: Acao | "documentos"; areaId: string | null; dados: Dados & { docIds?: string[] }; conversa: Conversa | null }
  /** não é com o robô: segue o fluxo antigo (ou fica quieto) */
  | { tipo: "ignorar" };

/** A conversa vale por 30 minutos; a pergunta "de quem são os documentos" vale por 24 horas */
export function conversaValida(c: unknown, em: Date | null, agora = new Date()): Conversa | null {
  if (!c || typeof c !== "object" || !em) return null;
  const passo = (c as { passo?: string }).passo;
  const limite = passo === "docs_de_quem" ? 24 * 3600e3 : 30 * 60e3;
  return +agora - +em <= limite ? (c as Conversa) : null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** "1", "sim", "não": responde sem chamar a IA */
export function pedidoRapido(texto: string): Pedido | null {
  const n = norm(texto).replace(/[.!]+$/, "");
  const base: Pedido = { acao: "nada", areaId: null, candidatos: [], opcao: null, quando: null, texto: "", avisos: false, participantes: [], local: "" };
  const num = n.match(/^(?:opcao\s*)?(\d{1,2})$/);
  if (num) return { ...base, acao: "opcao", opcao: +num[1] };
  if (/^(sim|s|pode|pode sim|isso|confirmo|confirma|ok|bora|manda|segue)$/.test(n)) return { ...base, acao: "sim" };
  if (/^(nao|n|nao precisa|cancela|deixa|nada|deixa pra la)$/.test(n)) return { ...base, acao: "nao" };
  return null;
}

/** Confere o que a IA devolveu: só ações conhecidas, áreas da lista, datas válidas no futuro, e-mails válidos */
export function lerPedido(v: unknown, idsDasAreas: Set<string>, agora = new Date()): Pedido {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const acao = ([...ACOES, ...OUTROS] as readonly string[]).includes(String(o.acao)) ? (o.acao as Pedido["acao"]) : "nada";
  const id = typeof o.areaId === "string" && idsDasAreas.has(o.areaId) ? o.areaId : null;
  const candidatos = Array.isArray(o.candidatos) ? [...new Set(o.candidatos.filter((c): c is string => typeof c === "string" && idsDasAreas.has(c)))].slice(0, 8) : [];
  const q = typeof o.quando === "string" ? new Date(o.quando) : null;
  const quando = q && !Number.isNaN(+q) && +q > +agora - 60e3 && +q < +agora + 400 * 86400e3 ? q : null;
  const txt = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
  const participantes = (Array.isArray(o.participantes) ? o.participantes : []).slice(0, 6).map((p) => {
    const r = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    const email = txt(r.email, 120).toLowerCase();
    return { nome: txt(r.nome, 80), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "", telefone: txt(r.telefone, 20).replace(/[^\d+]/g, "") };
  }).filter((p) => p.nome || p.email);
  const opcao = Number.isInteger(o.opcao) && (o.opcao as number) > 0 && (o.opcao as number) < 20 ? (o.opcao as number) : null;
  return { acao, areaId: id, candidatos: id ? [] : candidatos, opcao, quando, texto: txt(o.texto, 400), avisos: o.avisos === true, participantes, local: txt(o.local, 160) };
}

export const MENU = ["avancar", "estudo", "proposta", "nada"] as const;

/** Menu depois do status: as ações que fazem sentido para a etapa */
export function textoMenu(a: AreaNaLista) {
  const prox = proximaEtapa(a.etapa);
  return [
    "O que quer fazer?",
    `1 ${prox ? `Seguir para *${nomeEtapa(prox)}*` : "Seguir (já está na última etapa)"}`,
    "2 Fazer o estudo",
    "3 Criar a proposta com os dados que temos",
    "4 Nada por enquanto",
  ].join("\n");
}

const listaAreas = (ids: string[], areas: AreaNaLista[]) =>
  ids.map((id, i) => {
    const a = areas.find((x) => x.id === id);
    return a ? `${i + 1} ${a.titulo} (${nomeEtapa(a.etapa)})` : null;
  }).filter(Boolean).join("\n");

const quandoTexto = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** A pergunta antes de fazer: o que vai acontecer, com 1 Sim · 2 Não */
export function textoConfirmar(acao: Acao, a: AreaNaLista | null, dados: Dados = {}): string {
  const nome = a ? `*${a.titulo}*` : "";
  const prox = a ? proximaEtapa(a.etapa) : null;
  const corpo =
    acao === "avancar" ? (prox ? `Passo ${nome} de *${nomeEtapa(a!.etapa)}* para *${nomeEtapa(prox)}*?` : `${nome} já está na última etapa.`)
      : acao === "estudo" ? `Coloco o estudo de ${nome} na fila? (Viabilidade Legal; se ela já foi feita, a Mercadológica)`
        : acao === "proposta" ? `Crio a proposta de ${nome} com os dados dos estudos? Ela fica como rascunho no editor; nada vai para o proprietário.`
          : acao === "reuniao"
            ? [
              `Marco a reunião${a ? ` de ${nome}` : ""}?`,
              dados.quando ? `📅 ${quandoTexto(dados.quando)}` : "",
              ...(dados.participantes ?? []).map((p) => `👤 ${[p.nome, p.email, p.telefone].filter(Boolean).join(" · ")}`),
              dados.local ? `📍 ${dados.local}` : "",
              (dados.participantes ?? []).some((p) => p.email) ? "O convite vai por e-mail." : "",
            ].filter(Boolean).join("\n")
            : "";
  return acao === "avancar" && !prox ? corpo : `${corpo}\n1 Sim · 2 Não`;
}

/** Ação que precisa de área (lembrete e reunião podem ser sem área) */
const precisaArea = (a: Acao) => a !== "lembrete" && a !== "reuniao";
/** Ação que muda alguma coisa: só depois do "sim" */
const precisaConfirmar = (a: Acao) => a === "avancar" || a === "estudo" || a === "proposta" || a === "reuniao";

/** Leva a ação adiante com a área já escolhida: executa, ou pergunta antes */
function seguirCom(acao: Acao | null, areaId: string | null, dados: Dados, areas: AreaNaLista[]): Decisao {
  const a = areas.find((x) => x.id === areaId) ?? null;
  if (!acao || acao === "status") return { tipo: "executar", acao: "status", areaId, dados, conversa: areaId ? { passo: "o_que_fazer", areaId } : null };
  if (acao === "avancar" && a && !proximaEtapa(a.etapa)) return { tipo: "responder", texto: textoConfirmar("avancar", a), conversa: null };
  if (acao === "reuniao" && !dados.quando) return { tipo: "responder", texto: "Para quando é a reunião? Diga o dia e a hora (e o e-mail de quem participa).", conversa: null };
  if (precisaConfirmar(acao)) return { tipo: "responder", texto: textoConfirmar(acao, a, dados), conversa: { passo: "confirmar", acao, areaId, dados } };
  return { tipo: "executar", acao, areaId, dados, conversa: null };
}

function dadosDo(p: Pedido): Dados {
  const d: Dados = {};
  if (p.quando) d.quando = p.quando.toISOString();
  if (p.texto) d.texto = p.texto;
  if (p.avisos) d.avisos = true;
  if (p.participantes.length) d.participantes = p.participantes;
  if (p.local) d.local = p.local;
  return d;
}

/**
 * O próximo passo da conversa: responder (e guardar o que está esperando), executar uma ação ou deixar passar.
 * `areas` é a lista das áreas ativas; `doContexto` é a última área de que se falou no grupo.
 */
export function decidir(conversa: Conversa | null, p: Pedido, areas: AreaNaLista[], doContexto: string | null = null): Decisao {
  // respostas a uma pergunta em aberto
  if (conversa?.passo === "confirmar") {
    if (p.acao === "sim" || (p.acao === "opcao" && p.opcao === 1)) return { tipo: "executar", acao: conversa.acao, areaId: conversa.areaId, dados: conversa.dados ?? {}, conversa: null };
    if (p.acao === "nao" || (p.acao === "opcao" && p.opcao === 2)) return { tipo: "responder", texto: "Ok, não faço.", conversa: null };
  }
  if (conversa?.passo === "qual_area") {
    const escolhida = p.acao === "opcao" && p.opcao ? conversa.candidatos[p.opcao - 1] : p.areaId && conversa.candidatos.includes(p.areaId) ? p.areaId : p.acao === "sim" && conversa.candidatos.length === 1 ? conversa.candidatos[0] : p.areaId;
    if (escolhida) return seguirCom(conversa.acao, escolhida, conversa.dados ?? {}, areas);
    if (p.acao === "nao") return { tipo: "responder", texto: "Ok. Me diga o nome do proprietário, da área ou a cidade.", conversa: { ...conversa, candidatos: [] } };
  }
  if (conversa?.passo === "o_que_fazer" && (p.acao === "opcao" || p.acao === "nao")) {
    const escolha = p.acao === "nao" ? "nada" : MENU[(p.opcao ?? 0) - 1];
    if (escolha === "nada") return { tipo: "responder", texto: "Ok, fica como está.", conversa: null };
    if (escolha) return seguirCom(escolha, conversa.areaId, {}, areas);
  }
  if (conversa?.passo === "docs_de_quem") {
    const areaId = p.acao === "opcao" && p.opcao ? conversa.candidatos?.[p.opcao - 1] : p.areaId;
    if (areaId) return { tipo: "executar", acao: "documentos", areaId, dados: { docIds: conversa.docIds }, conversa: null };
    if (p.candidatos.length > 1) return { tipo: "responder", texto: `De qual delas?\n${listaAreas(p.candidatos, areas)}`, conversa: { ...conversa, candidatos: p.candidatos } };
  }

  // "os documentos são do Rogério" sem pergunta em aberto: vale para os que chegaram sem dono (ou para os próximos)
  if (p.acao === "documentos_de") {
    if (p.areaId) return { tipo: "executar", acao: "documentos", areaId: p.areaId, dados: { docIds: [] }, conversa: null };
    if (p.candidatos.length > 1) return { tipo: "responder", texto: `De qual delas?\n${listaAreas(p.candidatos, areas)}`, conversa: { passo: "docs_de_quem", docIds: [], candidatos: p.candidatos } };
    return { tipo: "ignorar" };
  }

  // pedido novo
  if (!(ACOES as readonly string[]).includes(p.acao)) return { tipo: "ignorar" };
  const acao = p.acao as Acao;
  const dados = dadosDo(p);
  if (acao === "lembrete") {
    if (!p.quando) return { tipo: "responder", texto: "Para quando é o lembrete? Diga o dia e a hora.", conversa: null };
    return { tipo: "executar", acao, areaId: p.areaId, dados, conversa: null };
  }
  const areaId = p.areaId ?? (p.candidatos.length ? null : doContexto);
  if (!areaId && (precisaArea(acao) || p.candidatos.length)) {
    if (p.candidatos.length) return { tipo: "responder", texto: `Seria qual destas?\n${listaAreas(p.candidatos, areas)}`, conversa: { passo: "qual_area", acao, candidatos: p.candidatos, dados } };
    return { tipo: "responder", texto: "Não achei essa área. Me diga o nome do proprietário, da área ou a cidade.", conversa: { passo: "qual_area", acao, candidatos: [], dados } };
  }
  return seguirCom(acao, areaId, dados, areas);
}

export type Lembrada = { autor: string; deMim: boolean; texto: string; arquivo: string | null; quando: Date };
export type AreaParaIA = AreaNaLista & { cidade: string; uf: string; dono: string | null; corretor: string | null; nome: string };

const hora = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** O que a IA recebe: agora, a conversa recente do grupo (memória), o que o robô está esperando e as áreas */
export function promptCentral(texto: string, memoria: Lembrada[], areas: AreaParaIA[], conversa: Conversa | null, agora = new Date()) {
  const conv = memoria.slice(-40).map((m) => `[${hora(m.quando)}] ${m.texto.startsWith("🤖") ? "Robô" : m.autor || (m.deMim ? "Fernando" : "alguém")}: ${m.arquivo ? `(arquivo ${m.arquivo}) ` : ""}${m.texto.slice(0, 400)}`).join("\n");
  const lista = areas.map((a) => `- ${a.id} | ${a.titulo} | nome: ${a.nome || "-"} | ${a.cidade}/${a.uf} | dono: ${a.dono || "-"} | corretor: ${a.corretor || "-"} | etapa: ${nomeEtapa(a.etapa)}`).join("\n");
  const esperando = conversa ? `O robô está esperando uma resposta: ${JSON.stringify(conversa)}` : "O robô não está esperando resposta.";
  return `Você interpreta mensagens do grupo de WhatsApp "JBL - Central" da JBL Incorporadora (loteamentos). Agora: ${agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", dateStyle: "full", timeStyle: "short" } as Intl.DateTimeFormatOptions)} (horário de Brasília, UTC-03:00).

Áreas (terrenos) cadastradas:
${lista || "(nenhuma)"}

Conversa recente do grupo (mais antiga primeiro):
${conv || "(vazia)"}

${esperando}

Mensagem nova: """${texto.slice(0, 1500)}"""

Responda só um JSON:
{"acao": uma de status|avancar|estudo|proposta|lembrete|reuniao|sim|nao|opcao|documentos_de|nada,
 "areaId": id da área de que a mensagem fala (use a conversa para entender "essa", "ele", "a do Rogério") ou null,
 "candidatos": ids das áreas possíveis quando não der para saber qual (ex.: duas em Martinópolis), senão [],
 "opcao": número escolhido de uma lista que o robô mandou, ou null,
 "quando": data e hora em ISO 8601 com -03:00 (lembrete ou reunião), ou null,
 "texto": o que lembrar (lembrete) ou assunto, ou "",
 "avisos": true se pediram o lembrete no grupo de Avisos,
 "participantes": [{"nome","email","telefone"}] da reunião, ou [],
 "local": local da reunião, ou ""}

Regras:
- status = perguntou situação, etapa, como está, andamento de um terreno/área.
- avancar = pediu para seguir/passar para a próxima etapa. estudo = fazer o estudo/viabilidade. proposta = criar/fazer a proposta.
- lembrete = "me lembra", "me avisa", "cria um lembrete". reuniao = marcar/agendar reunião.
- documentos_de = o robô perguntou de quem são documentos e a mensagem diz de quem (preencha areaId ou candidatos).
- sim/nao/opcao = resposta a uma pergunta do robô.
- nada = conversa entre as pessoas, agradecimento, ou qualquer coisa que não seja um pedido ao robô. Na dúvida, nada.
- Nunca invente área: use só ids da lista.`;
}
