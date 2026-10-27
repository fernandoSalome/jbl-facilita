import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { limparMinuta, minutaInicial } from "@/lib/minuta";
import { carregarCarta, dadosDe, enviarLinkEmail, enviarLinkWhatsapp, garantirLink, linkAssinatura, minutaAtual, nomeDe, reabrirMinuta } from "@/lib/minuta-acoes";
import { emailConfigurado } from "@/lib/email";

export const maxDuration = 60;

/** Minuta da carta para a equipe revisar */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const c = await carregarCarta(params.id);
    if (!c) return json({ error: "Carta não encontrada" }, 404);
    const p = dadosDe(c).proprietario ?? {};
    return json({
      id: c.id,
      protocolo: c.protocolo,
      recebidaEm: c.createdAt,
      nome: nomeDe(c),
      proposta: c.proposal.name,
      propostaId: c.proposal.id,
      projeto: `${c.proposal.project.name} · ${c.proposal.project.municipio}/${c.proposal.project.uf}`,
      telefone: p.telefone ?? "",
      email: p.email ?? "",
      emailConfigurado: emailConfigurado(),
      html: minutaAtual(c),
      editada: !!c.minutaHtml,
      status: c.minutaStatus,
      link: c.assinaturaToken && c.minutaStatus !== "revisao" ? linkAssinatura(c.assinaturaToken) : null,
      linkEnviadoEm: c.linkEnviadoEm,
      assinadaEm: c.assinadaEm,
      assinante: c.assinante,
      temPdfAssinado: !!c.pdfAssinadoNome,
    });
  });
}

/** Salva o texto editado (só enquanto a minuta está em revisão) */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const c = await carregarCarta(params.id);
    if (!c) return json({ error: "Carta não encontrada" }, 404);
    if (c.minutaStatus !== "revisao") return json({ error: "A minuta já foi enviada para assinatura. Reabra para editar." }, 409);
    const b = await req.json().catch(() => null);
    if (typeof b?.html !== "string" || b.html.length > 400_000) return json({ error: "Texto inválido" }, 400);
    await db.intentLetter.update({ where: { id: c.id }, data: { minutaHtml: limparMinuta(b.html) } });
    return json({ ok: true });
  });
}

/** Ações: link | whatsapp | email | reabrir | restaurar */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const c = await carregarCarta(params.id);
    if (!c) return json({ error: "Carta não encontrada" }, 404);
    const { acao } = (await req.json().catch(() => ({}))) as { acao?: string };
    try {
      if (acao === "link") {
        const { token } = await garantirLink(c);
        return json({ link: linkAssinatura(token) });
      }
      if (acao === "whatsapp") return json(await enviarLinkWhatsapp(c));
      if (acao === "email") return json(await enviarLinkEmail(c));
      if (acao === "reabrir") {
        await reabrirMinuta(c);
        return json({ ok: true });
      }
      if (acao === "restaurar") {
        if (c.minutaStatus !== "revisao") return json({ error: "Reabra a minuta para editar." }, 409);
        await db.intentLetter.update({ where: { id: c.id }, data: { minutaHtml: null } });
        return json({ html: minutaInicial(dadosDe(c), c.proposal.project, c.createdAt) });
      }
      return json({ error: "Ação inválida" }, 400);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 400);
    }
  });
}
