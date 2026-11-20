import { json, withSession } from "@/lib/api";
import { distribuir, ehFonte, SECOES } from "@/lib/captacao";
import { acrescentar } from "@/lib/captacao-db";

/** "Adicionar informação": o texto livre é dividido em frases e cada uma vai para a seção certa */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => ({}));
    const texto = typeof b.texto === "string" ? b.texto.slice(0, 8000) : "";
    if (!texto.trim()) return json({ error: "Escreva alguma coisa" }, 400);
    const fonte = ehFonte(b.fonte) ? b.fonte : "manual";
    const ref = `${s.name} · ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
    const novas = distribuir(texto, fonte, typeof b.ref === "string" && b.ref.trim() ? b.ref.slice(0, 120) : ref);
    // resposta digitada direto numa seção/pergunta
    if (Number.isInteger(b.secao) && b.secao >= 0 && b.secao < SECOES.length && typeof b.pergunta === "string") {
      novas.splice(0, novas.length, { ...novas[0], secao: b.secao, pergunta: b.pergunta.slice(0, 120), resposta: texto.trim().slice(0, 600) });
    }
    const n = await acrescentar(params.id, novas);
    return json({ ok: true, n, secoes: novas.map((r) => `${r.secao + 1}. ${SECOES[r.secao].titulo}`) });
  });
}
