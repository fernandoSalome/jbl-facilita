import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DEFAULT_INPUTS } from "@/lib/calc";
import { DEFAULT_OPTIONS } from "@/lib/proposals";
import JblPadrao from "@/components/template/JblPadrao";

export default async function TemplatePreview({ params }: { params: { id: string } }) {
  const t = await db.template.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!t || t.key !== "jbl-padrao") notFound();
  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow mb-1">Pré-visualização com dados de exemplo</div>
          <h1 className="h-display text-2xl">{t.name}</h1>
        </div>
        <Link href="/app/templates" className="btn-ghost">← Voltar</Link>
      </div>
      <div className="overflow-hidden rounded-md border border-line [transform:translateZ(0)]">
        <JblPadrao
          mode="preview"
          token="exemplo"
          project={{ name: "Gleba Exemplo", tipo: "Loteamento aberto", municipio: "Martinópolis", uf: "SP", matricula: "00.000", aerialImage: "/demo/sao-judas-tadeu-ii.jpg" }}
          ownerName="Família Exemplo"
          inputs={{ ...DEFAULT_INPUTS, areaTotal: 100000 }}
          options={DEFAULT_OPTIONS}
          overrides={{}}
          date={new Date().toISOString()}
        />
      </div>
    </div>
  );
}
