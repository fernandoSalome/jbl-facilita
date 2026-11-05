import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { apresentacaoDe } from "@/lib/apresentacao/server";
import { lerPlanilhaCustos } from "@/lib/apresentacao/planilha";

/** Atualizar dados da planilha: lê a aba "CUSTOS" do arquivo enviado; textos e aparência ficam como estão */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  return withSession(async () => {
    const a = await apresentacaoDe(params.slug);
    if (!a) return json({ error: "Apresentação não encontrada" }, 404);
    const form = await req.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) return json({ error: "Escolha o arquivo da planilha (.xlsx)." }, 400);
    if (!/\.xlsx$/i.test(arquivo.name)) return json({ error: "A planilha precisa ser um arquivo .xlsx (Excel)." }, 400);
    let dados;
    try {
      dados = lerPlanilhaCustos(Buffer.from(await arquivo.arrayBuffer()), arquivo.name);
    } catch (e) {
      return json({ error: (e as Error).message || "Não foi possível ler a planilha." }, 400);
    }
    if (dados.total === null) return json({ error: "A aba CUSTOS está sem o total calculado. Abra a planilha no Excel, salve e envie de novo." }, 400);
    await db.apresentacao.update({ where: { id: a.id }, data: { dados: dados as object } });
    return json({ dados });
  });
}
