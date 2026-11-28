import { json, withSession } from "@/lib/api";
import { ehEstudoChat, lerPergunta } from "@/lib/estudo-chat";
import { conversaDoEstudo, perguntarAoEstudo, responderInclusao } from "@/lib/estudo-chat-db";

export const dynamic = "force-dynamic";

/** Conversa do chat ao lado do estudo (?estudo=estudo|mercado) e se há resposta sendo preparada na VPS */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const estudo = new URL(req.url).searchParams.get("estudo");
    if (!ehEstudoChat(estudo)) return json({ error: "Estudo inválido" }, 400);
    return json(await conversaDoEstudo(params.id.slice(0, 40), estudo));
  });
}

/** { estudo, texto } pergunta · { estudo, mensagemId, incluir: true|false } responde "inclui na pesquisa?" */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const bruto = await req.text();
    if (bruto.length > 10_000) return json({ error: "Mensagem grande demais" }, 413);
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(bruto);
    } catch {
      return json({ error: "Dados inválidos" }, 400);
    }
    if (!ehEstudoChat(b.estudo)) return json({ error: "Estudo inválido" }, 400);
    const id = params.id.slice(0, 40);
    try {
      if (typeof b.mensagemId === "string" && typeof b.incluir === "boolean") {
        await responderInclusao(id, b.estudo, b.mensagemId.slice(0, 40), b.incluir, s.name);
      } else {
        const texto = lerPergunta(b.texto);
        if (!texto) return json({ error: "Escreva a pergunta (até 4.000 caracteres)" }, 400);
        await perguntarAoEstudo(id, b.estudo, texto, s.name);
      }
      return json(await conversaDoEstudo(id, b.estudo));
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  });
}
