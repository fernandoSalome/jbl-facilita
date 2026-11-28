"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { chamar } from "./chamar";

type Mensagem = { id: string; papel: string; autor: string | null; texto: string; proposta: string | null; inclusao: string | null; em: string };
type Conversa = { mensagens: Mensagem[]; esperando: string | null };

const NOMES = { estudo: "Viabilidade Legal", mercado: "Viabilidade Mercadológica" } as const;

/** **negrito** e quebras de linha; o resto é texto puro */
function Texto({ t }: { t: string }) {
  return (
    <span className="whitespace-pre-wrap">
      {t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <Fragment key={i}>{p}</Fragment>))}
    </span>
  );
}

/**
 * Chat ao lado do estudo (pedido 27/11/2026): botão ao lado de "Voltar ao estudo" que abre um painel lateral.
 * Quem responde é o Claude da VPS (assinatura); depois de cada resposta pergunta se inclui na pesquisa.
 */
export default function ChatEstudo({ areaId, estudo }: { areaId: string; estudo: "estudo" | "mercado" }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [c, setC] = useState<Conversa>({ mensagens: [], esperando: null });
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const incluidos = useRef(0);
  const url = `/api/areas/${areaId}/estudo-chat`;

  const carregar = useCallback(async () => {
    try {
      const d = await chamar<Conversa>(`${url}?estudo=${estudo}`, "GET");
      setC(d);
    } catch (e) {
      setErro((e as Error).message);
    }
  }, [url, estudo]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  // enquanto a VPS prepara a resposta, confere a cada 4 s
  useEffect(() => {
    if (!aberto || !c.esperando) return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [aberto, c.esperando, carregar]);

  // algo entrou no estudo: recarrega a página para mostrar o estudo novo
  useEffect(() => {
    const n = c.mensagens.filter((m) => m.inclusao === "feito").length;
    if (incluidos.current && n > incluidos.current) router.refresh();
    incluidos.current = n;
  }, [c.mensagens, router]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [c.mensagens.length, c.esperando, aberto]);

  async function enviar(corpo: Record<string, unknown>) {
    setEnviando(true);
    setErro("");
    try {
      setC(await chamar<Conversa>(url, "POST", { estudo, ...corpo }));
      return true;
    } catch (e) {
      setErro((e as Error).message);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function perguntar() {
    if (!texto.trim()) return;
    if (await enviar({ texto })) setTexto("");
  }

  const ocupado = enviando || !!c.esperando;
  const ultimaIncluindo = c.mensagens.some((m) => m.inclusao === "sim");

  return (
    <>
      <button className="btn-navy" onClick={() => setAberto(true)}>💬 Conversar com o estudo</button>
      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-navy/30" onClick={() => setAberto(false)}>
          <aside className="flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-start gap-3 border-b border-line bg-navy px-5 py-4 text-white">
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">Conversa com o estudo</p>
                <h3 className="text-lg font-semibold">{NOMES[estudo]}</h3>
                <p className="text-[12px] text-white/70">Pergunte o que dá para fazer ou não. O que for combinado só entra no estudo com o seu “sim”.</p>
              </div>
              <button className="text-2xl leading-none text-white/70 hover:text-white" aria-label="Fechar" onClick={() => setAberto(false)}>×</button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8FA] px-4 py-4 text-[14px]">
              {!c.mensagens.length && !c.esperando && (
                <div className="rounded-md border border-dashed border-line bg-white p-4 text-[13px] text-muted">
                  Exemplos: “dá para fazer condomínio de lotes aqui?”, “se eu escolher a ZREU-1, quantos lotes saem?”, “o que a APA proíbe nesta parte?”, “acrescente que a prefeitura confirmou a diretriz viária”.
                </div>
              )}
              {c.mensagens.map((m) => {
                const eu = m.papel === "eu";
                return (
                  <div key={m.id} className={`flex ${eu ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-lg px-3.5 py-2.5 shadow-sm ${eu ? "bg-navy text-white" : "border border-line bg-white text-ink"}`}>
                      <p className={`mb-1 text-[11px] font-semibold ${eu ? "text-gold" : "text-gold-ink"}`}>
                        {eu ? m.autor || "Equipe" : "Claude"} · {new Date(m.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <Texto t={m.texto} />
                      {m.papel === "claude" && m.inclusao !== "nao" && (
                        <div className="mt-3 rounded-md border border-gold-line bg-gold-soft p-3 text-[13px]">
                          {m.inclusao === null && (
                            <>
                              <p className="font-semibold text-navy">Incluir o que conversamos na pesquisa?</p>
                              {m.proposta && <p className="mt-1 text-ink"><Texto t={m.proposta} /></p>}
                              <div className="mt-2 flex gap-2">
                                <button className="btn-gold py-1.5 text-[13px]" disabled={ocupado} onClick={() => enviar({ mensagemId: m.id, incluir: true })}>Sim, incluir</button>
                                <button className="btn-ghost py-1.5 text-[13px]" disabled={enviando} onClick={() => enviar({ mensagemId: m.id, incluir: false })}>Não</button>
                              </div>
                            </>
                          )}
                          {m.inclusao === "sim" && <p className="font-semibold text-navy">⏳ Incluindo no estudo…</p>}
                          {m.inclusao === "feito" && <p className="font-semibold text-navy">✅ Incluído no estudo</p>}
                          {m.inclusao === "erro" && <p className="font-semibold text-navy">⚠️ Não deu para incluir. Pode pedir de novo.</p>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {c.esperando && (
                <div className="flex justify-start">
                  <div className="rounded-lg border border-line bg-white px-3.5 py-2.5 text-[13px] text-muted shadow-sm">
                    {ultimaIncluindo ? "⏳ Mudando o estudo…" : c.esperando === "fila" ? "⏳ Na fila do Claude…" : "🧠 Pensando… (de 20 s a 1 min)"}
                  </div>
                </div>
              )}
              <div ref={fim} />
            </div>

            <footer className="border-t border-line bg-white p-3">
              {erro && <p className="mb-2 text-[13px] font-semibold text-red-700">{erro}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  className="input min-h-[44px] flex-1 resize-none"
                  rows={2}
                  maxLength={4000}
                  placeholder={ocupado ? "Esperando a resposta…" : "Pergunte ou peça uma mudança no estudo"}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!ocupado) perguntar();
                    }
                  }}
                />
                <button className="btn-gold" disabled={ocupado || !texto.trim()} onClick={perguntar}>Enviar</button>
              </div>
              <p className="mt-1.5 text-[11.5px] text-muted">Enter envia · Shift+Enter pula linha · a conversa fica guardada na área</p>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
