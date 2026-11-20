import Link from "next/link";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { PAPEIS, tituloArea } from "@/lib/captacao";
import { getSession } from "@/lib/auth";
import ContatosTerra, { type ContatoLinha } from "@/components/captacao/ContatosTerra";

export const dynamic = "force-dynamic";

/** Conversas: todas as conversas de WhatsApp ligadas às áreas, com a última mensagem */
export default async function Conversas() {
  const conversas = await db.areaConversa.findMany({ where: { area: { deletedAt: null } }, include: { area: { select: { id: true, cidade: true, dono: true, corretor: true, nome: true } } }, orderBy: { createdAt: "desc" } });
  const ultimas = await db.areaMensagem.findMany({ distinct: ["areaId", "telefone"], orderBy: { quando: "desc" }, select: { areaId: true, telefone: true, texto: true, quando: true, deMim: true } });
  const ultima = (areaId: string, tel: string) => ultimas.find((m) => m.areaId === areaId && m.telefone === tel);
  // contatos de terra ainda sem área (pedido 20/11/2026)
  const session = await getSession();
  const ligados = new Set(conversas.map((c) => c.telefone));
  const terra = (await db.contatoTerra.findMany({ where: { situacao: "terra" }, orderBy: { ultimaEm: "desc" }, take: 300 })).filter((c) => !ligados.has(c.telefone));
  const pendentes = await db.contatoTerra.count({ where: { situacao: "pendente" } });
  const ultimasTerra = terra.length ? await db.mensagemParticular.findMany({ where: { telefone: { in: terra.map((c) => c.telefone) } }, distinct: ["telefone"], orderBy: { quando: "desc" }, select: { telefone: true, texto: true, deMim: true } }) : [];
  const contatos: ContatoLinha[] = terra.map((c) => {
    const u = ultimasTerra.find((m) => m.telefone === c.telefone);
    return { id: c.id, nome: c.nome || `+${c.telefone}`, telefone: c.telefone, papel: c.papel, resumo: c.resumo, ultima: u?.texto ?? null, ultimaDeMim: !!u?.deMim, quando: c.ultimaEm.toLocaleDateString("pt-BR") };
  });
  const areas = (await db.area.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, cidade: true, dono: true, corretor: true, nome: true } })).map((a) => ({ id: a.id, titulo: tituloArea(a) }));
  const lista = conversas.map((c) => ({ c, u: ultima(c.areaId, c.telefone) })).sort((x, y) => +(y.u?.quando ?? 0) - +(x.u?.quando ?? 0));
  return (
    <>
      <PageHeader eyebrow="Dia a dia" title="Conversas" subtitle="Proprietários, corretores e fontes de mercado ligados às áreas. Abra a área para conversar." />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 p-8">
        <ContatosTerra contatos={contatos} areas={areas} pendentes={pendentes} admin={session?.role === "ADMIN"} />
        <section className="grid min-w-0 gap-2">
        <h2 className="font-display text-xl text-navy">Ligadas a uma área</h2>
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
        </section>
      </div>
    </>
  );
}
