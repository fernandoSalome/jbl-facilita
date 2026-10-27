import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cartaPorToken } from "@/lib/assinatura";
import { hash, mesmoTelefone, novoCodigo, numeroWhatsapp, type DadosCarta } from "@/lib/minuta";
import { enviarTexto } from "@/lib/whatsapp";

/** Manda o código de 6 dígitos para o WhatsApp da pessoa (o mesmo número que ela informou na carta) */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const c = await cartaPorToken(params.token);
  if (!c || c.minutaStatus === "revisao") return json({ error: "Link inválido. Fale com a JBL." }, 404);
  if (c.minutaStatus === "assinada") return json({ error: "Esta carta já foi assinada." }, 409);
  const { telefone } = (await req.json().catch(() => ({}))) as { telefone?: string };
  const informado = (c.data as DadosCarta)?.proprietario?.telefone ?? "";
  const numero = numeroWhatsapp(telefone ?? "");
  if (!numero) return json({ error: "Digite o celular com DDD." }, 400);
  if (informado.replace(/\D/g, "") && !mesmoTelefone(telefone ?? "", informado)) {
    return json({ error: "Este não é o celular informado na carta. Confira o número ou fale com a JBL." }, 400);
  }
  // no máximo 5 códigos por hora
  if (c.codigoEnvios >= 5 && c.codigoExpira && c.codigoExpira.getTime() > Date.now() - 50 * 60 * 1000) {
    return json({ error: "Muitos códigos pedidos. Tente de novo em uma hora." }, 429);
  }
  const codigo = novoCodigo();
  await db.intentLetter.update({
    where: { id: c.id },
    data: { codigoHash: hash(`${c.id}:${codigo}`), codigoExpira: new Date(Date.now() + 10 * 60 * 1000), codigoTentativas: 0, codigoEnvios: c.codigoExpira && c.codigoExpira.getTime() < Date.now() - 50 * 60 * 1000 ? 1 : c.codigoEnvios + 1, telefoneConfirmado: null },
  });
  try {
    await enviarTexto(numero, `JBL Incorporadora: seu código para abrir a carta de intenção é *${codigo}*. Vale por 10 minutos. Não compartilhe este código.`);
  } catch {
    return json({ error: "Não foi possível enviar o código pelo WhatsApp agora. Tente de novo em instantes." }, 502);
  }
  return json({ ok: true });
}
