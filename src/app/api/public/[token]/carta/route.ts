import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { parseOptions } from "@/lib/proposals";
import { newProtocolo } from "@/lib/token";
import { avisarGrupos, dadosDaCarta, linkPortal, quemRecebeu } from "@/lib/avisos";
import { linkMinutaPortal } from "@/lib/minuta-acoes";
import { faltandoNaCarta, semConjuge } from "@/lib/carta";
import { waitUntil } from "@vercel/functions";
import { areaEmProposta, cartaRecebidaNaArea } from "@/lib/captacao-assinatura";

const MAX_FILE = 6 * 1024 * 1024;
/** O envio automático para o assinador (PDF + Autentique) continua depois da resposta */
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const p = await db.proposal.findFirst({ where: { publicToken: params.token, deletedAt: null }, include: { project: { select: { name: true } } } });
  if (!p || p.status === "rascunho") return json({ error: "Proposta indisponível" }, 404);
  if (!parseOptions(p.options).cartaIntencao) return json({ error: "Esta proposta não recebe carta de intenção" }, 400);

  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object" || typeof b.proprietario !== "object") return json({ error: "Formulário inválido." }, 400);
  // solteiro, divorciado ou viúvo: os dados de casamento e cônjuge não seguem com a carta
  if (semConjuge(b.casamento?.estadoCivil)) {
    b.casamento = { estadoCivil: String(b.casamento.estadoCivil) };
    b.conjuge = {};
  }
  // obrigatórios (menos nas propostas bloqueadas, que seguem como eram)
  if (!p.lockedAt) {
    const faltam = faltandoNaCarta(b);
    if (faltam.length) return json({ error: `Preencha os campos obrigatórios: ${faltam.map((f) => f.nome).join(", ")}.`, faltam: faltam.map((f) => f.k) }, 400);
  }
  if (b.matricula && (typeof b.matricula.data !== "string" || b.matricula.data.length > MAX_FILE * 1.4)) {
    return json({ error: "Arquivo da matrícula muito grande (máx. 6 MB)." }, 400);
  }

  const protocolo = newProtocolo();
  await db.intentLetter.create({ data: { proposalId: p.id, protocolo, data: b } });
  await db.proposal.update({
    where: { id: p.id },
    data: { status: ["enviada", "aberta"].includes(p.status) ? "carta_recebida" : p.status },
  });
  await db.proposalEvent.create({ data: { proposalId: p.id, type: "letter", meta: { protocolo } } });
  // aviso no grupo do WhatsApp: os dados enviados e o que fazer com a minuta (sem atrasar nem impedir o envio)
  const nome = String(b.proprietario?.nome ?? "").trim() || quemRecebeu(p);
  const carta = await db.intentLetter.findUnique({ where: { protocolo }, select: { id: true } });
  const tel = String(b.proprietario?.telefone ?? "").trim(), email = String(b.proprietario?.email ?? "").trim();
  // proposta de uma área da Captação: a área vai para Assinatura e o link já sai sozinho (pedido 20/11/2026)
  // (o PDF e a Autentique levam alguns segundos: roda depois de responder, para a pessoa não esperar)
  const daArea = carta ? await areaEmProposta(p.id) : false;
  if (carta && daArea) {
    waitUntil(
      (async () => {
        const enviado = await cartaRecebidaNaArea(p.id, carta.id).catch((e) => `⚠️ Não consegui mandar o link sozinho: ${(e as Error).message}`);
        await avisarGrupos(
          `📩 *${nome}* enviou os dados da carta de intenção (proposta *${p.name}*, ${p.project.name}).\nProtocolo: ${protocolo}\n\n${dadosDaCarta(b)}\n\n${enviado ?? ""}\nA área passou para a etapa *Assinatura da carta*. Para ver ou reabrir a minuta: ${linkMinutaPortal(carta.id)}`,
        ).catch(() => {});
      })(),
    );
    return json({ protocolo });
  }
  await avisarGrupos(
    `📩 *${nome}* enviou os dados da carta de intenção (proposta *${p.name}*, ${p.project.name}).\nProtocolo: ${protocolo}\n\n${dadosDaCarta(b)}\n\n` +
      `A minuta já está montada. O que deseja fazer? Responda aqui:\n• *ver minuta* → mando o PDF da minuta\n• *enviar link* → mando para ela o link de assinatura no WhatsApp${tel ? ` (${tel})` : " (ela não informou telefone)"}\n• *enviar email* → mando o link para o e-mail${email ? ` (${email})` : " (ela não informou e-mail)"}\n• *não* → nada é enviado\n\nPara revisar e editar antes: ${carta ? linkMinutaPortal(carta.id) : linkPortal(new URL(req.url).origin, p.id)}`,
  ).catch(() => {});
  return json({ protocolo });
}
