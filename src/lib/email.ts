/**
 * Envio de e-mail pelo Resend (https://resend.com). Variáveis: RESEND_API_KEY e EMAIL_FROM
 * (ex.: "JBL Incorporadora <contato@seudominio.com.br>", com o domínio verificado no Resend).
 * Sem elas, o envio por e-mail fica indisponível e a tela avisa.
 */
export const emailConfigurado = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function enviarEmail(para: string, assunto: string, html: string) {
  if (!emailConfigurado()) throw new Error("Envio de e-mail não configurado (RESEND_API_KEY e EMAIL_FROM).");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [para], subject: assunto, html }),
  });
  if (!r.ok) throw new Error(`E-mail não enviado (${r.status}): ${(await r.text()).slice(0, 200)}`);
}
