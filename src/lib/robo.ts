import { db } from "./db";
import { entenderTexto, lerDocumento, projetoPorTexto, TIPOS } from "./ia";
import { baixarMidia, enviadasPeloRobo, enviarArquivo, enviarTexto, nomeDoGrupo, type Recebida } from "./whatsapp";

/**
 * Robô do WhatsApp. Por enquanto só age no grupo de comandos (nome com "JBL IA"):
 *  - arquivo recebido → guarda na pasta do loteamento e confirma;
 *  - "estou enviando a matrícula do X" → responde que vai armazenar;
 *  - "manda a matrícula do X" → envia o arquivo no grupo dizendo de qual loteamento é;
 *  - "como está o X" / "quais documentos do X" → resumo da pasta.
 * Mensagens de qualquer outro grupo ou conversa são ignoradas e não ficam guardadas.
 */

const GRUPO_CONTROLE = /jbl\s*ia/i;
const ROBO = "🤖";
const CONTEXTO_MIN = 30;
const MAX_ARQUIVO = 20 * 1024 * 1024;

const projetosAtivos = () =>
  db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, municipio: true, uf: true }, orderBy: { name: "asc" } });

async function grupoMonitorado(jid: string) {
  const g = await db.waGroup.findUnique({ where: { jid } });
  if (g) return g;
  const nome = await nomeDoGrupo(jid).catch(() => "");
  if (!GRUPO_CONTROLE.test(nome)) return null;
  return db.waGroup.create({ data: { jid, name: nome, papel: "controle" } });
}

const pastaDe = (tipo: string) => TIPOS[tipo]?.pasta ?? "Outros";
const tamanho = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const listaProjetos = (ps: { name: string }[]) => ps.map((p) => `• ${p.name}`).join("\n");

export async function tratarMensagem(m: Recebida) {
  if (!m.grupo.endsWith("@g.us")) return;
  if (enviadasPeloRobo.has(m.id)) return;
  if (m.deMim && m.texto.startsWith(ROBO)) return;
  if (Date.now() - m.quando.getTime() > 10 * 60 * 1000) return; // histórico antigo sincronizando
  const g = await grupoMonitorado(m.grupo);
  if (!g) return;

  const projetos = await projetosAtivos();
  const citado = m.texto ? projetoPorTexto(m.texto, projetos) : null;
  const contextoValido = g.contextoProjectId && g.contextoAt && Date.now() - g.contextoAt.getTime() < CONTEXTO_MIN * 60 * 1000 ? g.contextoProjectId : null;
  const lembrar = (projectId: string) => db.waGroup.update({ where: { id: g.id }, data: { contextoProjectId: projectId, contextoAt: new Date() } });
  const responder = (t: string) => enviarTexto(m.grupo, `${ROBO} ${t}`);

  /* ---------- chegou um arquivo ---------- */
  if (m.arquivo) {
    if (await db.projectDocument.findUnique({ where: { messageId: m.id } })) return;
    const midia = await baixarMidia(m.id);
    const bytes = Buffer.from(midia.base64, "base64");
    if (bytes.length > MAX_ARQUIVO) return responder(`Esse arquivo passa de 20 MB e não consegui guardar. Pode mandar uma versão menor?`);
    const mime = midia.mimetype || m.arquivo.mime;
    const fileName = midia.fileName || m.arquivo.fileName;
    const leitura = await lerDocumento({ base64: midia.base64, mime, fileName, legenda: m.texto }, projetos);
    const projectId = citado?.id ?? leitura.projetoId ?? contextoValido ?? null;
    const doc = await db.projectDocument.create({
      data: {
        projectId, tipo: leitura.tipo, titulo: leitura.titulo, resumo: leitura.resumo ?? null, dados: (leitura.dados ?? undefined) as object | undefined,
        fileName, mime, size: bytes.length, data: bytes, origem: "whatsapp", enviadoPor: m.autor || null, grupo: g.name, messageId: m.id,
      },
    });
    if (!projectId) {
      return responder(`Recebi *${doc.titulo}* (${fileName}), mas não sei de qual loteamento é. Me responde com o nome:\n${listaProjetos(projetos)}`);
    }
    await lembrar(projectId);
    const p = projetos.find((x) => x.id === projectId)!;
    const extra = leitura.resumo ? `\n📝 ${leitura.resumo}` : "";
    return responder(
      `Armazenado! ✅\n📁 *${p.name}* › ${pastaDe(doc.tipo)}\n📄 ${doc.titulo} (${fileName}, ${tamanho(bytes.length)})${extra}\n\nPara pedir de volta: _manda a ${TIPOS[doc.tipo].nome.toLowerCase()} do ${p.name}_`,
    );
  }

  if (!m.texto) return;

  /* ---------- texto ---------- */
  // documento que chegou sem loteamento: a resposta com o nome resolve
  if (citado) {
    const pendentes = await db.projectDocument.findMany({
      where: { projectId: null, grupo: g.name, deletedAt: null, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
      select: { id: true, titulo: true, tipo: true },
    });
    if (pendentes.length) {
      await db.projectDocument.updateMany({ where: { id: { in: pendentes.map((d) => d.id) } }, data: { projectId: citado.id } });
      await lembrar(citado.id);
      return responder(`Pronto! Guardei na pasta do *${citado.name}*:\n${pendentes.map((d) => `📄 ${d.titulo} › ${pastaDe(d.tipo)}`).join("\n")}`);
    }
  }

  const it = await entenderTexto(m.texto, projetos);
  const projetoId = it.projetoId ?? citado?.id ?? null;
  if (projetoId) await lembrar(projetoId);
  const alvo = projetos.find((p) => p.id === (projetoId ?? contextoValido));

  switch (it.acao) {
    case "aviso_envio": {
      const oque = it.tipo ? `a ${TIPOS[it.tipo].nome.toLowerCase()}` : "o documento";
      return responder(
        alvo
          ? `Pode mandar ${oque}! Assim que chegar, vou armazenar na pasta do *${alvo.name}*. 📁`
          : `Pode mandar ${oque}! Vou armazenar assim que chegar. Se puder, diga de qual loteamento é (ou escreva na legenda do arquivo).`,
      );
    }
    case "pedido_documento": {
      if (!alvo) return responder(`De qual loteamento? Tenho pastas para:\n${listaProjetos(projetos)}`);
      const doc = await db.projectDocument.findFirst({
        where: { projectId: alvo.id, deletedAt: null, ...(it.tipo ? { tipo: it.tipo } : {}) },
        orderBy: { createdAt: "desc" },
      });
      if (!doc) {
        const oque = it.tipo ? TIPOS[it.tipo].nome.toLowerCase() : "documento";
        return responder(`Ainda não tenho ${oque} na pasta do *${alvo.name}*. Se alguém mandar aqui, eu guardo.`);
      }
      const quando = doc.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await enviarArquivo(m.grupo, {
        base64: Buffer.from(doc.data).toString("base64"),
        mime: doc.mime,
        fileName: doc.fileName,
        caption: `${ROBO} *${doc.titulo}*\n📁 Loteamento *${alvo.name}* (${alvo.municipio}/${alvo.uf}) › ${pastaDe(doc.tipo)}\n🗓 Recebido em ${quando}${doc.enviadoPor ? ` · enviado por ${doc.enviadoPor}` : ""}${doc.grupo ? ` no grupo ${doc.grupo}` : ""}`,
      });
      return;
    }
    case "status":
    case "listar": {
      if (!alvo) return responder(`De qual loteamento? Tenho pastas para:\n${listaProjetos(projetos)}`);
      const docs = await db.projectDocument.findMany({ where: { projectId: alvo.id, deletedAt: null }, select: { tipo: true, titulo: true, createdAt: true }, orderBy: { createdAt: "desc" } });
      const props = await db.proposal.findMany({ where: { projectId: alvo.id, deletedAt: null }, select: { name: true, status: true } });
      const porPasta = new Map<string, string[]>();
      for (const d of docs) porPasta.set(pastaDe(d.tipo), [...(porPasta.get(pastaDe(d.tipo)) ?? []), d.titulo]);
      const pastas = docs.length ? [...porPasta].map(([k, v]) => `📁 ${k}: ${v.join("; ")}`).join("\n") : "📁 Nenhum documento guardado ainda.";
      const falta = ["matricula", "car", "certidao"].filter((t) => !docs.some((d) => d.tipo === t)).map((t) => TIPOS[t].nome);
      const ultimo = docs[0] ? `\n🕓 Último documento: ${docs[0].titulo} (${docs[0].createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })})` : "";
      const propTxt = props.length ? `\n📄 Propostas: ${props.map((p) => `${p.name} (${p.status.replace("_", " ")})`).join("; ")}` : "";
      return responder(`*${alvo.name}* · ${alvo.municipio}/${alvo.uf}\n${pastas}${ultimo}${propTxt}${falta.length ? `\n⏳ Ainda falta: ${falta.join(", ")}` : ""}`);
    }
    case "ajuda":
      return responder(
        `Sou o assistente da JBL. Aqui você pode:\n• Mandar um documento (PDF ou foto): eu guardo na pasta do loteamento.\n• Pedir: _manda a matrícula do São Judas_\n• Perguntar: _como está o São Judas?_\n\nLoteamentos:\n${listaProjetos(projetos)}`,
      );
    default:
      return;
  }
}
