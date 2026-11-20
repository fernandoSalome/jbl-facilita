import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { PAPEIS, tituloArea } from "@/lib/captacao";
import { conversaDoTelefone } from "@/lib/contatos-terra-db";
import Inbox, { type ItemConversa } from "@/components/conversas/Inbox";

export const dynamic = "force-dynamic";

const PAPEL_TERRA: Record<string, string> = { proprietario: "Terrenista", corretor: "Corretor", outro: "Contato de terra" };
const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/**
 * Conversas (pedido 20/11/2026): todas as conversas de terra no formato do WhatsApp. À esquerda, as ligadas a
 * uma área e os contatos de terra que o Claude separou; à direita, a conversa aberta, para responder e ligar.
 */
export default async function Conversas({ searchParams }: { searchParams: { c?: string } }) {
  const [ligadas, terra, pendentes, areasDb] = await Promise.all([
    db.areaConversa.findMany({ where: { area: { deletedAt: null } }, include: { area: { select: { id: true, cidade: true, dono: true, corretor: true, nome: true } } } }),
    db.contatoTerra.findMany({ where: { situacao: "terra" }, orderBy: { ultimaEm: "desc" }, take: 500 }),
    db.contatoTerra.count({ where: { situacao: "pendente" } }),
    db.area.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, cidade: true, dono: true, corretor: true, nome: true } }),
  ]);
  const areas = areasDb.map((a) => ({ id: a.id, titulo: tituloArea(a) }));

  // um item por telefone: junta o contato de terra e as áreas ligadas a ele
  const porTel = new Map<string, ItemConversa & { em: number }>();
  for (const c of terra)
    porTel.set(c.telefone, { telefone: c.telefone, nome: c.nome || `+${c.telefone}`, sub: PAPEL_TERRA[c.papel ?? ""] ?? "Contato de terra", ultima: null, quando: null, contatoId: c.id, areas: [], em: +c.ultimaEm });
  for (const l of ligadas) {
    const it = porTel.get(l.telefone) ?? { telefone: l.telefone, nome: l.nome, sub: "", ultima: null, quando: null, contatoId: null, areas: [], em: 0 };
    it.areas.push({ id: l.area.id, titulo: tituloArea(l.area) });
    it.sub = `${PAPEIS[l.papel] ?? l.papel} · ${it.areas.map((a) => a.titulo).join(", ")}`;
    porTel.set(l.telefone, it);
  }
  const tels = [...porTel.keys()];
  const [ultPart, ultArea] = tels.length
    ? await Promise.all([
        db.mensagemParticular.findMany({ where: { telefone: { in: tels } }, distinct: ["telefone"], orderBy: { quando: "desc" }, select: { telefone: true, texto: true, deMim: true, quando: true } }),
        db.areaMensagem.findMany({ where: { telefone: { in: tels } }, distinct: ["telefone"], orderBy: { quando: "desc" }, select: { telefone: true, texto: true, deMim: true, quando: true } }),
      ])
    : [[], []];
  for (const m of [...ultPart, ...ultArea]) {
    const it = porTel.get(m.telefone)!;
    if (+m.quando >= it.em || !it.ultima) {
      it.em = Math.max(it.em, +m.quando);
      it.ultima = `${m.deMim ? "Você: " : ""}${m.texto}`;
    }
  }
  const lista = [...porTel.values()].sort((a, b) => b.em - a.em).map(({ em, ...it }) => ({ ...it, quando: em ? dia(new Date(em)) : null }));

  const tel = (searchParams.c ?? "").replace(/\D/g, "").slice(0, 15);
  const atual = lista.find((c) => c.telefone === tel) ?? null;
  const mensagens = atual ? (await conversaDoTelefone(atual.telefone)).map((m) => ({ ...m, quando: m.quando.toISOString() })) : [];
  const resumo = atual ? terra.find((c) => c.telefone === atual.telefone)?.resumo ?? null : null;

  return (
    <>
      <PageHeader eyebrow="Dia a dia" title="Conversas" subtitle="Terrenistas e corretores: o Claude lê suas conversas do WhatsApp e separa as de terra. Responda daqui e ligue à área." />
      <div className="p-6">
        <Inbox lista={lista} atual={atual} resumo={resumo} mensagens={mensagens} areas={areas} pendentes={pendentes} />
      </div>
    </>
  );
}
