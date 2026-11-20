import Link from "next/link";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { PAPEIS, tituloArea } from "@/lib/captacao";

export const dynamic = "force-dynamic";

/** Conversas: todas as conversas de WhatsApp ligadas às áreas, com a última mensagem */
export default async function Conversas() {
  const conversas = await db.areaConversa.findMany({ where: { area: { deletedAt: null } }, include: { area: { select: { id: true, cidade: true, dono: true, corretor: true, nome: true } } }, orderBy: { createdAt: "desc" } });
  const ultimas = await db.areaMensagem.findMany({ distinct: ["areaId", "telefone"], orderBy: { quando: "desc" }, select: { areaId: true, telefone: true, texto: true, quando: true, deMim: true } });
  const ultima = (areaId: string, tel: string) => ultimas.find((m) => m.areaId === areaId && m.telefone === tel);
  const lista = conversas.map((c) => ({ c, u: ultima(c.areaId, c.telefone) })).sort((x, y) => +(y.u?.quando ?? 0) - +(x.u?.quando ?? 0));
  return (
    <>
      <PageHeader eyebrow="Dia a dia" title="Conversas" subtitle="Proprietários, corretores e fontes de mercado ligados às áreas. Abra a área para conversar." />
      <div className="p-8">
        <div className="card divide-y divide-line">
          {lista.map(({ c, u }) => (
            <Link key={c.id} href={`/app/captacao/${c.area.id}?aba=etapa&ver=captacao`} className="flex items-center gap-3 px-4 py-3 hover:bg-gold-soft">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy font-display text-gold">{c.nome[0]}</span>
              <span className="min-w-0 flex-1">
                <b className="text-navy">{c.nome}</b> <span className="text-[12px] text-muted">{PAPEIS[c.papel] ?? c.papel} · {tituloArea(c.area)}{c.nutrir ? " · nutrindo o checklist" : ""}</span>
                <span className="block truncate text-[13px] text-muted">{u ? `${u.deMim ? "Você: " : ""}${u.texto}` : "sem mensagens ainda"}</span>
              </span>
              {u && <span className="shrink-0 text-[12px] text-muted">{u.quando.toLocaleDateString("pt-BR")}</span>}
            </Link>
          ))}
          {!lista.length && <p className="px-4 py-8 text-center text-sm text-muted">Nenhuma conversa ligada. Ligue em Captação › área › Configurações.</p>}
        </div>
      </div>
    </>
  );
}
