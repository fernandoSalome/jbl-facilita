import { db } from "./db";
import { ETAPA, FASES, faseDoDocumento, faseEmUso } from "./fases";
import { entenderTexto, lerDocumento, norm, projetoPorTexto, TIPOS } from "./ia";
import { pdfDaProposta } from "./pdf";
import { responderProposta } from "./robo-propostas";
import { baixarMidia, enviadasPeloRobo, enviarArquivo, enviarTexto, nomeDoGrupo, type Recebida } from "./whatsapp";

/**
 * Robô do WhatsApp. Só age nos grupos cadastrados (tela "Assistente WhatsApp" do portal):
 *  - arquivo recebido → guarda na pasta do loteamento, na etapa do processo, e confirma;
 *  - "estou enviando a matrícula do X" → responde que vai armazenar;
 *  - "manda a matrícula do X" → envia o arquivo; "manda os documentos da aprovação do X" → envia os da etapa;
 *  - "manda a proposta do X" → envia o PDF da proposta;
 *  - "qual o valor do lote no X?" → responde pelas propostas;
 *  - "como está o X" / "quais documentos do X" → resumo da pasta, por etapa.
 * Mensagens de qualquer outro grupo ou conversa são ignoradas e não ficam guardadas.
 */

const ROBO = "🤖";
/** Quantos arquivos o robô manda de uma vez quando pedem os documentos de uma etapa */
const MAX_ENVIO = 6;
const CONTEXTO_MIN = 30;
const MAX_ARQUIVO = 20 * 1024 * 1024;

const projetosAtivos = () =>
  db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true, municipio: true, uf: true, fase: true }, orderBy: { name: "asc" } });

/** Só os grupos cadastrados (e ativos) são atendidos; o nome vem do WhatsApp na 1ª mensagem */
async function grupoMonitorado(jid: string) {
  const g = await db.waGroup.findUnique({ where: { jid } });
  if (!g || g.papel === "inativo") return null;
  if (!g.name || g.name === jid) {
    const nome = await nomeDoGrupo(jid).catch(() => "");
    if (nome) return db.waGroup.update({ where: { id: g.id }, data: { name: nome } });
  }
  return g;
}

/** Endereço para gerar o PDF da proposta (a página pública é aberta por dentro do servidor) */
const origemInterna = () =>
  process.env.VERCEL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL}` : `http://127.0.0.1:${process.env.PORT || 3000}`;

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
    const projeto = projetos.find((x) => x.id === projectId);
    const fase = leitura.fase && ETAPA[leitura.fase] ? leitura.fase : faseDoDocumento(leitura.tipo, `${m.texto} ${fileName}`, projeto?.fase);
    const doc = await db.projectDocument.create({
      data: {
        projectId, tipo: leitura.tipo, fase, titulo: leitura.titulo, resumo: leitura.resumo ?? null, dados: (leitura.dados ?? undefined) as object | undefined,
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
      `Armazenado! ✅\n📁 *${p.name}* › ${ETAPA[fase]} › ${pastaDe(doc.tipo)}\n📄 ${doc.titulo} (${fileName}, ${tamanho(bytes.length)})${extra}\n\nPara pedir de volta: _manda a ${TIPOS[doc.tipo].nome.toLowerCase()} do ${p.name}_ ou _manda os documentos da ${ETAPA[fase].toLowerCase()} do ${p.name}_`,
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
      // "manda os documentos da aprovação do X": todos os da etapa
      if (!it.tipo && it.fase) {
        const todos = await db.projectDocument.findMany({ where: { projectId: alvo.id, deletedAt: null }, orderBy: { createdAt: "desc" } });
        const daEtapa = todos.filter((d) => faseEmUso(d) === it.fase);
        if (!daEtapa.length) return responder(`Ainda não tenho documentos da etapa *${ETAPA[it.fase]}* do *${alvo.name}*.`);
        await responder(`Mandando ${Math.min(daEtapa.length, MAX_ENVIO)} documento(s) da etapa *${ETAPA[it.fase]}* do *${alvo.name}*:${daEtapa.length > MAX_ENVIO ? ` (são ${daEtapa.length}; mando os ${MAX_ENVIO} mais recentes)` : ""}`);
        for (const d of daEtapa.slice(0, MAX_ENVIO)) {
          await enviarArquivo(m.grupo, { base64: Buffer.from(d.data).toString("base64"), mime: d.mime, fileName: d.fileName, caption: `${ROBO} *${d.titulo}*\n📁 ${alvo.name} › ${ETAPA[it.fase]} › ${pastaDe(d.tipo)}` });
        }
        return;
      }
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
        caption: `${ROBO} *${doc.titulo}*\n📁 Loteamento *${alvo.name}* (${alvo.municipio}/${alvo.uf}) › ${ETAPA[faseEmUso(doc)]} › ${pastaDe(doc.tipo)}\n🗓 Recebido em ${quando}${doc.enviadoPor ? ` · enviado por ${doc.enviadoPor}` : ""}${doc.grupo ? ` no grupo ${doc.grupo}` : ""}`,
      });
      return;
    }
    case "pedido_proposta": {
      if (!alvo) return responder(`De qual loteamento? Tenho propostas para:\n${listaProjetos(projetos)}`);
      const props = await db.proposal.findMany({
        where: { projectId: alvo.id, deletedAt: null },
        select: { name: true, ownerName: true, status: true, publicToken: true },
        orderBy: { updatedAt: "desc" },
      });
      if (!props.length) return responder(`O *${alvo.name}* ainda não tem proposta no portal.`);
      // a proposta citada pelo nome ou pelo terrenista; senão a mais recente já enviada
      const n = norm(m.texto);
      const escolhida =
        props.find((p) => [p.name, p.ownerName].some((x) => norm(x).split(/\s+/).some((w) => w.length >= 4 && n.includes(w)))) ??
        props.find((p) => p.status !== "rascunho") ??
        props[0];
      await responder(`Gerando o PDF da proposta *${escolhida.name}* (${alvo.name})… ⏳`);
      const pdf = await pdfDaProposta(origemInterna(), escolhida.publicToken).catch((e) => (console.error("robo pdf", e), null));
      if (!pdf) return responder(`Não consegui gerar o PDF agora. O link da proposta funciona: ${origemInterna().startsWith("http://127") ? "" : `${origemInterna()}/p/${escolhida.publicToken}`}`);
      const nome = `Proposta JBL - ${alvo.name} - ${escolhida.name}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "");
      await enviarArquivo(m.grupo, {
        base64: pdf.data.toString("base64"),
        mime: "application/pdf",
        fileName: nome,
        caption: `${ROBO} *${escolhida.name}* · ${alvo.name}\n👤 ${escolhida.ownerName} · ${pdf.pages} páginas${props.length > 1 ? `\nOutras propostas deste loteamento: ${props.filter((p) => p !== escolhida).map((p) => p.name).join("; ")}` : ""}`,
      });
      return;
    }
    case "pergunta_proposta":
      return responder(await responderProposta(m.texto, projetoId ?? contextoValido));
    case "status":
    case "listar": {
      if (!alvo) return responder(`De qual loteamento? Tenho pastas para:\n${listaProjetos(projetos)}`);
      const docs = await db.projectDocument.findMany({ where: { projectId: alvo.id, deletedAt: null }, select: { tipo: true, fase: true, titulo: true, createdAt: true }, orderBy: { createdAt: "desc" } });
      const props = await db.proposal.findMany({ where: { projectId: alvo.id, deletedAt: null }, select: { name: true, status: true } });
      // documentos separados por etapa do processo (e a pasta de cada um)
      const pastas = docs.length
        ? FASES.map(([f]) => [f, docs.filter((d) => faseEmUso(d) === f)] as const)
            .filter(([, ds]) => ds.length)
            .map(([f, ds]) => `*${ETAPA[f]}*\n${ds.map((d) => `  📄 ${d.titulo} _(${pastaDe(d.tipo)})_`).join("\n")}`)
            .join("\n")
        : "📁 Nenhum documento guardado ainda.";
      const faseAtual = FASES.find(([f]) => f === alvo.fase)?.[1];
      const falta = ["matricula", "car", "certidao"].filter((t) => !docs.some((d) => d.tipo === t)).map((t) => TIPOS[t].nome);
      const ultimo = docs[0] ? `\n🕓 Último documento: ${docs[0].titulo} (${docs[0].createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })})` : "";
      const propTxt = props.length ? `\n📄 Propostas: ${props.map((p) => `${p.name} (${p.status.replace("_", " ")})`).join("; ")}` : "";
      return responder(`*${alvo.name}* · ${alvo.municipio}/${alvo.uf}${faseAtual ? ` · fase: ${faseAtual}` : ""}\n${pastas}${ultimo}${propTxt}${falta.length ? `\n⏳ Ainda falta: ${falta.join(", ")}` : ""}`);
    }
    case "ajuda":
      return responder(
        `Sou o assistente da JBL. Aqui você pode:\n• *Mandar um documento* (PDF ou foto) de qualquer etapa: eu guardo na pasta do loteamento. Diga a etapa se quiser: _segue a licença da aprovação do São Judas_\n• *Pedir um documento:* _manda a matrícula do São Judas_\n• *Pedir os de uma etapa:* _manda os documentos da aprovação do São Judas_\n• *Pedir a proposta em PDF:* _manda a proposta do São Judas_\n• *Perguntar das propostas:* _qual o valor do lote na proposta do São Judas?_\n• *Ver o andamento:* _como está o São Judas?_\n\nEtapas: ${FASES.map(([f]) => ETAPA[f]).join(" · ")}\n\nLoteamentos:\n${listaProjetos(projetos)}`,
      );
    default:
      return;
  }
}
