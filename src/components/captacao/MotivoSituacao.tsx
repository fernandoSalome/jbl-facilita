import { diasParaSair } from "@/lib/captacao";

const dia = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Quadro com o motivo do descarte ou da geladeira, no topo da área (pedido 20/11/2026).
 *  Depois de reativada, o que aconteceu antes continua visível, menor. */
export default function MotivoSituacao({ a }: { a: { situacao: string; motivoDescarte: string | null; descartadaEm: Date | null; motivoGeladeira: string | null; geladeiraEm: Date | null; geladeiraAte: Date | null } }) {
  if (a.situacao === "descartada")
    return (
      <section className="card border-2 border-rose-200 bg-rose-50 p-5">
        <h3 className="font-display text-xl text-rose-800">✖ Área descartada{a.descartadaEm ? ` em ${dia(a.descartadaEm)}` : ""}</h3>
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] text-navy"><b>Motivo:</b> {a.motivoDescarte ?? "não informado (descartada antes de existir o motivo)"}</p>
      </section>
    );
  if (a.situacao === "geladeira") {
    const d = a.geladeiraAte ? diasParaSair(a.geladeiraAte) : null;
    return (
      <section className="card border-2 border-sky-200 bg-sky-50 p-5">
        <h3 className="font-display text-xl text-navy">❄️ Na geladeira{a.geladeiraEm ? ` desde ${dia(a.geladeiraEm)}` : ""}{a.geladeiraAte ? ` · até ${dia(a.geladeiraAte)}` : ""}</h3>
        {d !== null && <p className={`mt-1 text-[13px] font-semibold ${d <= 5 ? "text-rose-700" : "text-muted"}`}>{d > 0 ? `Faltam ${d} dia(s).` : "O tempo acabou: decidir se reativa ou deixa mais tempo."}</p>}
        <p className="mt-1.5 whitespace-pre-wrap text-[15px] text-navy"><b>Motivo da espera:</b> {a.motivoGeladeira ?? "não informado"}</p>
      </section>
    );
  }
  const antes = [
    a.motivoDescarte && a.descartadaEm ? `Foi descartada em ${dia(a.descartadaEm)}: ${a.motivoDescarte}` : null,
    a.motivoGeladeira && a.geladeiraEm ? `Ficou na geladeira em ${dia(a.geladeiraEm)}: ${a.motivoGeladeira}` : null,
  ].filter(Boolean);
  if (!antes.length) return null;
  return <section className="rounded border border-line bg-surface px-4 py-2.5 text-[13px] text-muted">{antes.map((t) => <p key={t}>↩ {t}</p>)}</section>;
}
