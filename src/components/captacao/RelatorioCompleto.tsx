import { sanitizeHtml } from "@/lib/sanitize";
import type { Bloco, Relatorio } from "@/lib/relatorio";

/** Texto em linha já limpo na leitura; passa de novo pelo sanitizeHtml na hora de mostrar (regra do projeto) */
const H = ({ html, className }: { html: string; className?: string }) => <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;

function Bloco({ b }: { b: Bloco }) {
  switch (b.t) {
    case "p":
      return b.estilo === "destaque" ? (
        <div className="rounded-md border-l-4 border-gold bg-gold-soft p-4 text-[15px] leading-relaxed"><H html={b.html} /></div>
      ) : (
        <p className={b.estilo === "nota" ? "text-[13px] leading-relaxed text-muted" : "text-[15px] leading-relaxed"}><H html={b.html} /></p>
      );
    case "tiles":
      return (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {b.itens.map((t) => (
            <div key={t.k} className="rounded-md border border-gold-line bg-gold-soft p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gold-ink">{t.k}</div>
              <div className="mt-1 font-display text-[26px] leading-tight text-navy">{t.n}</div>
              <div className="mt-1 text-[12.5px] text-muted">{t.d}</div>
            </div>
          ))}
        </div>
      );
    case "cols":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {b.cols.map((c, i) => (
            <div key={c.titulo} className={`rounded-md border p-5 ${i === 0 ? "border-emerald-200 bg-emerald-50/40" : "border-rose-200 bg-rose-50/40"}`}>
              <h3 className="mb-2 font-display text-lg text-navy">{c.titulo}</h3>
              <ul className="grid gap-1.5 text-[14px]">{c.itens.map((x, j) => <li key={j}>• <H html={x} /></li>)}</ul>
            </div>
          ))}
        </div>
      );
    case "tabela":
      return (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="w-full text-[13.5px]">
            <thead className="bg-navy text-left text-[11.5px] uppercase tracking-wider text-white"><tr>{b.cab.map((c) => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
            <tbody>{b.linhas.map((l, i) => <tr key={i} className="border-t border-line align-top even:bg-alt">{l.map((c, j) => <td key={j} className="px-3 py-2"><H html={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "img":
      return b.img ? (
        <figure className="break-inside-avoid">
          {/* imagem do próprio raio-x, guardada no banco */}
          <img src={b.img} alt={b.legenda} className="w-full rounded-md border border-line" loading="lazy" />
          {b.legenda && <figcaption className="mt-2 text-[13px] text-muted">{b.legenda}</figcaption>}
        </figure>
      ) : null;
    case "kv":
      return (
        <dl className="grid gap-2 text-[14.5px] md:grid-cols-[220px_1fr]">
          {b.itens.map(([k, v]) => [<dt key={`k${k}`} className="font-semibold text-navy">{k}</dt>, <dd key={`v${k}`}><H html={v} /></dd>])}
        </dl>
      );
    case "sub":
      return <h3 className="font-display text-xl text-navy">{b.texto}</h3>;
    case "lista": {
      const L = b.ordenada ? "ol" : "ul";
      return (
        <L className="grid gap-2 text-[15px]">
          {b.itens.map((x, i) => (
            <li key={i} className="flex gap-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-[12px] font-bold text-gold">{b.ordenada ? i + 1 : "•"}</span><H html={x} /></li>
          ))}
        </L>
      );
    }
  }
}

/** As seções do raio-x, numeradas a partir de "inicio" (a página do parceiro põe o mapa antes) */
export default function RelatorioCompleto({ r, inicio = 1 }: { r: Relatorio; inicio?: number }) {
  return (
    <>
      {r.secoes.map((s, i) => (
        <section key={s.titulo} className="border-t border-line py-10">
          <div className="eyebrow mb-4">{String(inicio + i).padStart(2, "0")} · {s.titulo}</div>
          <div className="grid gap-5">{s.blocos.map((b, j) => <Bloco key={j} b={b} />)}</div>
        </section>
      ))}
    </>
  );
}
