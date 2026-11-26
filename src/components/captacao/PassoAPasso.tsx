"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BotoesCarta from "@/components/andamento/BotoesCarta";
import LinhaDoTempo from "@/components/andamento/LinhaDoTempo";
import { aplicarTratamento, dataPorExtenso, montarPassos, PASSOS, progressoPassos, tratamentoPadrao, type Andamento, type MarcaPasso } from "@/lib/passo-a-passo";
import { chamar } from "./chamar";

/**
 * Passo a passo do proprietário (pedido 25/11/2026): a equipe marca cada passo como realizado (à mão, por
 * enquanto), troca o texto ou deixa uma nota; o proprietário vê pelo link. Grava sozinho a cada mudança.
 */
export default function PassoAPasso({ id, inicial, dono, token, speHref, cartaHref }: { id: string; inicial: Andamento; dono: string | null; token: string | null; speHref: string | null; cartaHref: string | null }) {
  const botoes = <BotoesCarta speHref={speHref} cartaHref={cartaHref} />;
  const router = useRouter();
  const [a, setA] = useState<Andamento>(inicial);
  const [modo, setModo] = useState<"editar" | "ver">("editar");
  const [editando, setEditando] = useState<string | null>(null);
  const [estado, setEstado] = useState<"" | "salvando" | "salvo" | string>("");
  // o que já está gravado: só salva quando muda de verdade (o modo estrito roda o efeito duas vezes)
  const gravado = useRef(JSON.stringify(inicial));
  const passos = montarPassos(a, dono);
  const prog = progressoPassos(passos);
  const tratamento = a.tratamento || tratamentoPadrao(dono);

  // grava 700 ms depois da última mudança; o menu (badge) se atualiza no refresh
  useEffect(() => {
    const json = JSON.stringify(a);
    if (json === gravado.current) return;
    setEstado("salvando");
    const t = setTimeout(async () => {
      try {
        await chamar(`/api/areas/${id}/andamento`, "PUT", a);
        gravado.current = json;
        setEstado("salvo");
        router.refresh();
      } catch (e) {
        setEstado((e as Error).message);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [a, id, router]);

  const marcar = (pid: string, m: Partial<MarcaPasso>) =>
    setA((v) => {
      const novo: MarcaPasso = { ...v.passos[pid], ...m };
      (Object.keys(novo) as (keyof MarcaPasso)[]).forEach((k) => { if (!novo[k]) delete novo[k]; });
      return { ...v, passos: { ...v.passos, [pid]: novo } };
    });

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 bg-navy px-5 py-4 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-lg">🧭</span>
            <div className="flex-1">
              <h2 className="font-display text-[22px] leading-tight">Passo a passo do proprietário</h2>
              <p className="text-[13px] text-white/70">Marque cada passo quando for realizado. O proprietário acompanha pelo link.</p>
            </div>
            <div className="flex rounded-full bg-white/10 p-1 text-[13px] font-semibold">
              {(["editar", "ver"] as const).map((m) => (
                <button key={m} onClick={() => setModo(m)} className={`rounded-full px-3.5 py-1.5 transition ${modo === m ? "bg-gold text-navy" : "text-white/80 hover:text-white"}`}>
                  {m === "editar" ? "✏️ Editar" : "👁 Como ele vê"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-3">
            <div className="flex-1">
              <div className="flex items-baseline justify-between text-[13px]">
                <b className="text-navy">{prog.feitos} de {prog.total} realizados</b>
                <span className="font-display text-[18px] text-gold-deep">{prog.pct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-50">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${prog.pct}%` }} />
              </div>
            </div>
            <span className="w-20 text-right text-[12.5px] font-semibold text-muted">{estado === "salvando" ? "Salvando…" : estado === "salvo" ? "✓ Salvo" : estado}</span>
          </div>
          {modo === "editar" && (
            <label className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13.5px]">
              <span className="font-semibold text-navy">Como chamar o proprietário nos textos:</span>
              <input className="input max-w-[220px] py-1.5 text-[14px]" maxLength={60} placeholder={tratamentoPadrao(dono)} value={a.tratamento ?? ""} onChange={(e) => setA((v) => ({ ...v, tratamento: e.target.value }))} />
              <span className="text-[12.5px] text-muted">ex.: Sr. Rogério, Sra. Ana</span>
            </label>
          )}
        </section>

        {modo === "ver" ? (
          <section className="card p-5 md:p-8"><LinhaDoTempo passos={passos} extras={{ "carta-spe": botoes }} /></section>
        ) : (
          passos.map((p) => {
            const m = a.passos[p.id] ?? {};
            const feito = p.situacao === "feito";
            const padrao = PASSOS.find((x) => x.id === p.id)!;
            return (
              <section key={p.id} className={`card p-5 transition ${feito ? "border-gold-line" : p.situacao === "proximo" ? "border-gold ring-2 ring-gold-soft" : ""}`}>
                <div className="flex flex-wrap items-start gap-4">
                  <button
                    onClick={() => marcar(p.id, feito ? { feito: false, feitoEm: undefined } : { feito: true })}
                    title={feito ? "Desmarcar" : "Marcar como realizado"}
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 transition ${feito ? "border-gold bg-gold text-white" : "border-line bg-white text-muted hover:border-gold hover:text-gold-deep"}`}
                  >
                    {feito ? <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : <span className="font-display text-[13px]">{p.numero}</span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[19px] leading-snug text-navy">{p.numero}. {p.titulo}</h3>
                      {feito && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-ink">Realizado</span>}
                      {p.situacao === "proximo" && <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold">Próximo passo</span>}
                    </div>
                    {editando === p.id ? (
                      <div className="mt-2">
                        <textarea className="input min-h-[180px] text-[14px] leading-relaxed" maxLength={2500} value={m.texto ?? aplicarTratamento(padrao.texto, tratamento)} onChange={(e) => marcar(p.id, { texto: e.target.value })} />
                        <div className="mt-1.5 flex gap-3 text-[12.5px]">
                          <button className="font-semibold text-navy hover:underline" onClick={() => setEditando(null)}>✓ Pronto</button>
                          {!p.textoPadrao && <button className="font-semibold text-gold-deep hover:underline" onClick={() => { marcar(p.id, { texto: undefined }); setEditando(null); }}>↩ Voltar ao texto original</button>}
                          <span className="text-muted">Linha em branco separa os parágrafos.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1.5 grid gap-2 text-[14px] leading-relaxed text-ink">
                        {p.texto.split(/\n{2,}/).map((par, j) => <p key={j}>{par}</p>)}
                      </div>
                    )}
                    {p.id === "carta-spe" && (
                      <>
                        {botoes}
                        {(!speHref || !cartaHref) && (
                          <p className="mt-2 text-[12.5px] text-muted">
                            {!speHref && <>O botão “Baixar Modelo SPE” aparece depois que o modelo subir em <a className="font-semibold text-navy underline" href="/app/templates">Templates</a>. </>}
                            {!cartaHref && <>O botão da Carta de Intenção aparece quando a área tiver proposta enviada.</>}
                          </p>
                        )}
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-[13px]">
                      {feito ? (
                        // a data só aparece para o proprietário se a equipe puser (pedido 25/11/2026)
                        <label className="flex flex-wrap items-center gap-2 text-navy">
                          <b>Data (opcional)</b>
                          <input type="date" className="input w-auto py-1 text-[13px]" value={m.feitoEm ?? ""} onChange={(e) => marcar(p.id, { feitoEm: e.target.value || undefined })} />
                          <span className="text-muted">{m.feitoEm ? `aparece como ${dataPorExtenso(m.feitoEm)}` : "sem data: aparece só “Realizado”"}</span>
                        </label>
                      ) : (
                        <button className={`${p.situacao === "proximo" ? "btn-gold" : "btn-ghost"} py-1.5 text-[13px]`} onClick={() => marcar(p.id, { feito: true })}>Marcar como realizado</button>
                      )}
                      <span className="flex-1" />
                      {editando !== p.id && <button className="font-semibold text-navy hover:underline" onClick={() => setEditando(p.id)}>✏️ Editar texto</button>}
                    </div>
                    <input className="input mt-2 py-1.5 text-[13px]" maxLength={300} placeholder="Atualização para o proprietário (opcional), ex.: carta recebida, minuta enviada ao jurídico" value={m.nota ?? ""} onChange={(e) => marcar(p.id, { nota: e.target.value })} />
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      <LinkPassoAPasso id={id} token={token} tratamento={tratamento} />
    </div>
  );
}

/** Link para o proprietário: gerar, copiar, abrir, mandar no WhatsApp ou desativar */
function LinkPassoAPasso({ id, token, tratamento }: { id: string; token: string | null; tratamento: string }) {
  const router = useRouter();
  const [t, setT] = useState(token);
  const [msg, setMsg] = useState("");
  const url = t ? `${typeof window === "undefined" ? "" : window.location.origin}/andamento/${t}` : "";
  async function gerar() {
    try {
      const r = await chamar<{ token: string }>(`/api/areas/${id}/andamento/link`, "POST");
      setT(r.token);
      setMsg("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <aside className="card sticky top-4 overflow-hidden border-2 border-gold-line">
      <div className="bg-gold-soft px-5 py-4">
        <h3 className="font-display text-[19px] text-navy">🔗 Link para o proprietário</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">Página com a logo da JBL e a linha do tempo dos passos. Ele vê o que já foi realizado e o próximo passo; não vê estudo, conversas nem números.</p>
      </div>
      <div className="grid gap-2 p-5">
        {!t ? (
          <button className="btn-gold w-full" onClick={gerar}>Gerar link</button>
        ) : (
          <>
            <input className="input py-1.5 text-[12.5px]" readOnly value={url} onFocus={(e) => e.target.select()} />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-gold py-1.5 text-[13px]" onClick={async () => { await navigator.clipboard.writeText(url); setMsg("✅ Link copiado."); }}>Copiar</button>
              <a className="btn-ghost py-1.5 text-[13px]" href={url} target="_blank" rel="noreferrer">Abrir</a>
            </div>
            <a className="btn-navy py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${tratamento}! Por este link você acompanha cada passo da nossa parceria com a JBL Incorporadora: ${url}`)}`}>Mandar no WhatsApp</a>
            <button className="mt-1 text-[12.5px] font-semibold text-rose-700 hover:underline" onClick={async () => { if (!confirm("Desativar? Quem tem o link não consegue mais abrir.")) return; await chamar(`/api/areas/${id}/andamento/link`, "DELETE"); setT(null); router.refresh(); }}>Desativar link</button>
          </>
        )}
        {msg && <p className="text-[13px] font-semibold text-navy">{msg}</p>}
      </div>
    </aside>
  );
}
