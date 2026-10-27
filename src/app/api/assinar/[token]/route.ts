import { json } from "@/lib/api";
import { cartaPorToken, mascararTelefone, sessaoOk } from "@/lib/assinatura";
import { documentoMinuta, type DadosCarta } from "@/lib/minuta";

export const dynamic = "force-dynamic";

/** Situação do link de assinatura; a minuta só aparece depois de confirmar o celular */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const c = await cartaPorToken(params.token);
  if (!c || c.minutaStatus === "revisao") return json({ error: "Link inválido ou substituído por um mais novo. Fale com a JBL." }, 404);
  const d = (c.data ?? {}) as DadosCarta;
  const ok = sessaoOk(c);
  return json({
    nome: (d.proprietario?.nome ?? c.proposal.ownerName).split(/\s+/)[0],
    projeto: c.proposal.project.name,
    protocolo: c.protocolo,
    telefone: mascararTelefone(d.proprietario?.telefone ?? ""),
    temTelefone: !!(d.proprietario?.telefone ?? "").replace(/\D/g, ""),
    confirmado: ok,
    assinada: c.minutaStatus === "assinada",
    minuta: ok && c.minutaFinal ? documentoMinuta(c.minutaFinal, { titulo: "Minuta" }) : null,
  });
}
