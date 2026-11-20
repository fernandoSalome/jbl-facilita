import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MapaInterativo from "@/components/captacao/MapaInterativo";
import BotaoImprimir from "@/components/captacao/BotaoImprimir";
import { estudoPorToken } from "@/lib/captacao-db";
import { lerEstudo1, lerEstudo2, SEMAFOROS, VEREDITOS } from "@/lib/captacao-estudos";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Estudo de viabilidade · JBL Incorporadora", robots: { index: false, follow: false } };

const ha = (n: number | null) => (n ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "—");
const nf = (n: number | null) => (n == null ? "—" : n.toLocaleString("pt-BR"));

/**
 * Estudo de viabilidade para parceiros (pedido 19/11/2026): link público com código, no visual da proposta
 * (logo, azul-marinho e dourado). Mostra só o estudo: sem nome do proprietário, corretor, conversas,
 * checklist, margem ou parte do proprietário.
 */
export default async function EstudoPublico({ params }: { params: { token: string } }) {
  const a = await estudoPorToken(params.token);
  if (!a) notFound();
  const e1 = lerEstudo1(a.estudo1);
  const e2 = lerEstudo2(a.estudo2);
  const poligono = lerPoligono(a.poligono);
  const titulo = a.nome || `Área em ${a.cidade}`;
  const data = (a.estudoLinkEm ?? a.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
  const temMercado = !!(e2.veredito || e2.concorrentes.length || e2.produto);
  const Secao = ({ n, t, children }: { n: number; t: string; children: React.ReactNode }) => (
    <section className="break-inside-avoid border-t border-line py-10">
      <div className="eyebrow mb-3">{String(n).padStart(2, "0")} · {t}</div>
      {children}
    </section>
  );
  let n = 0;

  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="border-b-4 border-gold bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora" className="h-12 w-auto md:h-14" />
          <div className="print:hidden"><BotaoImprimir /></div>
        </div>
      </header>

      <div className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-gold">Estudo de viabilidade · preliminar</div>
          <h1 className="font-display text-[40px] leading-tight md:text-[52px]">{titulo}</h1>
          <p className="mt-2 text-lg text-white/80">{a.cidade} · {a.uf} · {ha(a.hectares)}</p>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-white/75">
            Este estudo reúne o que a legislação permite fazer na área, quanto dela pode virar lote e como está o mercado em volta.
            É uma triagem: os números servem para decidir se vale aprofundar, e cada ponto em aberto está indicado com o caminho para resolver.
          </p>
          <p className="mt-4 text-[13px] text-white/50">Preparado pela JBL Incorporadora em {data}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <section className="grid gap-4 py-10 md:grid-cols-4">
          {[
            ["Parecer", e1.semaforo ? SEMAFOROS[e1.semaforo] : "em análise"],
            ["Zona e lote mínimo", [e1.zona, e1.loteMinimo].filter(Boolean).join(" · ") || "—"],
            ["Lotes (cenário médio)", nf(e1.lotes.medio)],
            ["Área aproveitável", e1.aproveitavelPct != null ? `${e1.aproveitavelPct}%` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-gold-line bg-gold-soft p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gold-ink">{k}</div>
              <div className="mt-1 font-display text-[22px] leading-snug text-navy">{v}</div>
            </div>
          ))}
        </section>

        {poligono && (
          <Secao n={++n} t="A área">
            <MapaInterativo poligono={poligono} altura={460} />
            <p className="mt-3 text-sm text-muted">Polígono do arquivo KMZ sobre a foto de satélite. Área medida: {ha(a.hectares)}.</p>
          </Secao>
        )}

        <Secao n={++n} t="O que a legislação permite">
          <h2 className="h-display text-[28px]">{e1.produto || "Produto em definição"}</h2>
          <ul className="mt-3 grid gap-1.5 text-[15px]">
            {e1.zona && <li>• Zona: <b>{e1.zona}</b></li>}
            {e1.loteMinimo && <li>• Lote mínimo: <b>{e1.loteMinimo}</b></li>}
          </ul>
        </Secao>

        {(e1.lotes.pior != null || e1.lotes.medio != null || e1.lotes.bom != null) && (
          <Secao n={++n} t="Quantos lotes cabem">
            <div className="grid gap-4 md:grid-cols-3">
              {([["pior", "Cenário conservador"], ["medio", "Cenário provável"], ["bom", "Cenário otimista"]] as const).map(([k, t]) => (
                <div key={k} className={`rounded-md border p-5 ${k === "medio" ? "border-2 border-gold" : "border-line"}`}>
                  <div className="text-[12px] font-bold uppercase tracking-wider text-muted">{t}</div>
                  <div className="mt-1 font-display text-[36px] text-navy">{nf(e1.lotes[k])}</div>
                  <div className="text-sm text-muted">lotes</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">A diferença entre os cenários vem do que ainda precisa ser confirmado em campo (principalmente meio ambiente). Os pontos estão listados abaixo.</p>
          </Secao>
        )}

        {e1.estrategia.length > 0 && (
          <Secao n={++n} t="Estratégia da gleba">
            <ul className="grid gap-1.5 text-[15px]">{e1.estrategia.map((s) => <li key={s}>• {s}</li>)}</ul>
          </Secao>
        )}

        {e1.alertas.length > 0 && (
          <Secao n={++n} t="Pontos de atenção e como resolver">
            <div className="grid gap-3">
              {e1.alertas.map((al, i) => (
                <div key={i} className="grid gap-1 rounded-md border border-line p-4 md:grid-cols-[1fr_1fr] md:gap-6">
                  <div><b className="text-navy">{i + 1}. {al.texto}</b></div>
                  <div className="text-[14px]">{al.comoResolver ? <>→ {al.comoResolver}</> : <span className="text-muted">a definir</span>}</div>
                </div>
              ))}
            </div>
          </Secao>
        )}

        {(e1.regiao.m2Min || e1.regiao.tipologia || e1.regiao.expansao || e1.regiao.cidades) && (
          <Secao n={++n} t="A região">
            <ul className="grid gap-1.5 text-[15px]">
              {e1.regiao.m2Min != null && <li>• Valor do m² vendido: <b>R$ {nf(e1.regiao.m2Min)}{e1.regiao.m2Max ? ` a R$ ${nf(e1.regiao.m2Max)}` : ""}</b></li>}
              {e1.regiao.tipologia && <li>• Tipologia em volta: {e1.regiao.tipologia}</li>}
              {e1.regiao.expansao && <li>• Expansão urbana: {e1.regiao.expansao}</li>}
              {e1.regiao.cidades && <li>• Cidades em volta: {e1.regiao.cidades}</li>}
            </ul>
          </Secao>
        )}

        {temMercado && (
          <Secao n={++n} t="Mercado e concorrência">
            {e2.veredito && <p className="mb-4 font-display text-[24px] text-navy">{VEREDITOS[e2.veredito]}</p>}
            {e2.concorrentes.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-navy text-left text-[12px] uppercase tracking-wider text-white"><tr>{["Empreendimento", "Dist.", "Tipo", "Lote", "Lançamento", "Hoje", "Vendido"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
                  <tbody>{e2.concorrentes.map((c, i) => <tr key={i} className="border-t border-line">{[c.nome, c.distancia, c.tipo, c.lote, c.lancamento, c.hoje, c.vendido].map((v, j) => <td key={j} className="px-3 py-2">{v || "—"}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {e2.lacunas && <p className="mt-4 text-[15px]"><b>O que falta no mercado:</b> {e2.lacunas}</p>}
            {e2.produto && <div className="mt-4 rounded-md border-l-4 border-gold bg-gold-soft p-4 text-[15px]"><b>Produto recomendado:</b> {e2.produto}</div>}
            {(e2.financeiro.vgv || e2.financeiro.velocidade) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {e2.financeiro.vgv && <div className="rounded-md border border-line p-4"><div className="text-[12px] font-bold uppercase tracking-wider text-muted">VGV estimado</div><div className="font-display text-[26px] text-navy">{e2.financeiro.vgv}</div></div>}
                {e2.financeiro.velocidade && <div className="rounded-md border border-line p-4"><div className="text-[12px] font-bold uppercase tracking-wider text-muted">Velocidade de venda esperada</div><div className="font-display text-[26px] text-navy">{e2.financeiro.velocidade}</div></div>}
              </div>
            )}
            {e2.risco && <p className="mt-4 text-sm text-muted"><b>Principal risco de mercado:</b> {e2.risco}</p>}
          </Secao>
        )}

        <Secao n={++n} t="Próximos passos">
          <ol className="grid gap-1.5 text-[15px]">
            <li>1. Matrícula atualizada e certidões</li>
            <li>2. Certidão de uso do solo e diretrizes da Prefeitura</li>
            <li>3. Levantamento planialtimétrico e vistoria ambiental</li>
            <li>4. Viabilidade das concessionárias (água, esgoto e energia)</li>
            <li>5. Estudo de 30 dias para confirmar as premissas</li>
          </ol>
        </Secao>

        <section className="border-t border-line py-8 text-[12.5px] leading-relaxed text-muted">
          Estudo preliminar, feito com base em legislação publicada, mapas oficiais, imagens de satélite e informações de mercado disponíveis na data acima.
          Não substitui certidões, levantamento topográfico nem laudos. Documento confidencial, para uso do destinatário.
        </section>
      </div>

      <footer className="bg-navy py-8 text-center">
        <img src="/brand/logo-vertical.webp" alt="JBL Incorporadora" className="mx-auto h-16 w-auto opacity-90" />
        <p className="mt-3 text-[12px] tracking-wide text-white/60">JBL Incorporadora · Urbanismo e Empreendimentos</p>
      </footer>
    </main>
  );
}
