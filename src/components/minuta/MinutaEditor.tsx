"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CSS_MINUTA_TELA } from "./estilo";

type Dados = {
  id: string;
  protocolo: string;
  recebidaEm: string;
  nome: string;
  proposta: string;
  propostaId: string;
  projeto: string;
  telefone: string;
  email: string;
  emailConfigurado: boolean;
  html: string;
  editada: boolean;
  status: "revisao" | "enviada" | "assinada";
  link: string | null;
  linkEnviadoEm: string | null;
  assinadaEm: string | null;
  assinante: string | null;
  temPdfAssinado: boolean;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "");

/**
 * Editor da minuta, parecido com um Word: negrito, itálico, sublinhado, tamanho, cor,
 * alinhamento e listas. Salva sozinho. Ao gerar o link, o texto fica travado.
 */
export default function MinutaEditor({ id }: { id: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [salvo, setSalvo] = useState<"ok" | "salvando" | "erro">("ok");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; txt: string } | null>(null);
  const [ocupado, setOcupado] = useState("");
  const area = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/letters/${id}/minuta`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return setMsg({ tipo: "erro", txt: j.error ?? "Não foi possível abrir a minuta." });
    setD(j);
    if (area.current) area.current.innerHTML = j.html;
  }, [id]);
  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    if (d && area.current && !area.current.innerHTML) area.current.innerHTML = d.html;
  }, [d]);

  const editavel = d?.status === "revisao";

  async function salvarAgora() {
    if (!area.current || !editavel) return;
    setSalvo("salvando");
    const r = await fetch(`/api/letters/${id}/minuta`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ html: area.current.innerHTML }) });
    setSalvo(r.ok ? "ok" : "erro");
  }
  function mudou() {
    setSalvo("salvando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(salvarAgora, 900);
  }
  // salva antes de sair da página
  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => {
      if (salvo === "salvando") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", sair);
    return () => window.removeEventListener("beforeunload", sair);
  }, [salvo]);

  function cmd(c: string, v?: string) {
    if (!editavel) return;
    area.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(c, false, v);
    mudou();
  }

  async function acao(a: "link" | "whatsapp" | "email" | "reabrir" | "restaurar", rotulo: string) {
    if (a === "reabrir" && !confirm("Reabrir para editar? O link de assinatura enviado deixa de valer e será preciso mandar um novo.")) return;
    if (a === "restaurar" && !confirm("Voltar ao texto montado com os dados que ela enviou? As suas alterações serão perdidas.")) return;
    if ((a === "link" || a === "whatsapp" || a === "email") && d?.status === "revisao" && !confirm("Ao gerar o link, o texto fica travado nesta versão (é o que ela vai assinar). Continuar?")) return;
    if (salvo === "salvando") await salvarAgora();
    setOcupado(rotulo);
    setMsg(null);
    try {
      const r = await fetch(`/api/letters/${id}/minuta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: a }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível.");
      if (a === "link" && j.link) {
        await navigator.clipboard?.writeText(j.link).catch(() => {});
        setMsg({ tipo: "ok", txt: `Link de assinatura copiado: ${j.link}` });
      } else if (a === "whatsapp" || a === "email") {
        setMsg({ tipo: "ok", txt: `Link enviado para ${j.para}.` });
      } else if (a === "restaurar" && area.current) {
        area.current.innerHTML = j.html;
      }
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", txt: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado("");
    }
  }

  const B = ({ t, on, children, ativo = true }: { t: string; on: () => void; children: React.ReactNode; ativo?: boolean }) => (
    <button type="button" title={t} disabled={!editavel || !ativo} onMouseDown={(e) => e.preventDefault()} onClick={on} className="grid h-8 min-w-8 place-items-center rounded px-1.5 text-[13px] font-semibold text-navy hover:bg-gold-soft disabled:opacity-35">
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-alt">
      <style dangerouslySetInnerHTML={{ __html: CSS_MINUTA_TELA }} />
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href={d ? `/app/proposta/${d.propostaId}` : "/app"} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-navy hover:bg-alt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Voltar
          </Link>
          <span className="h-6 w-px bg-line" />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">Minuta da carta de intenção</div>
            <h1 className="h-display truncate text-lg leading-tight">{d ? `${d.nome} · ${d.projeto}` : "Carregando…"}</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {d && <span className="text-[12.5px] text-muted">{editavel ? (salvo === "salvando" ? "Salvando…" : salvo === "erro" ? "⚠ Não foi possível salvar" : "✓ Salvo") : d.status === "assinada" ? "✓ Assinada" : "🔒 Texto travado"}</span>}
            <a className="btn-ghost" href={`/api/letters/${id}/minuta/pdf`} target="_blank" rel="noreferrer">Ver PDF</a>
            {d?.status === "revisao" && <button className="btn-ghost" disabled={!!ocupado} onClick={() => acao("link", "link")}>Gerar link de assinatura</button>}
            {d && d.status !== "assinada" && (
              <>
                <button className="btn-ghost" disabled={!!ocupado || !d.email || !d.emailConfigurado} title={!d.email ? "Ela não informou e-mail" : !d.emailConfigurado ? "Envio por e-mail ainda não configurado" : `Enviar para ${d.email}`} onClick={() => acao("email", "email")}>Enviar por e-mail</button>
                <button className="btn-gold" disabled={!!ocupado || !d.telefone} title={d.telefone ? `Enviar para ${d.telefone}` : "Ela não informou telefone"} onClick={() => acao("whatsapp", "whatsapp")}>{ocupado === "whatsapp" ? "Enviando…" : "Enviar no WhatsApp"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[920px] px-4 py-5 sm:px-6">
        {d && (
          <div className="mb-3 grid gap-1 rounded border border-line bg-white px-4 py-3 text-[13px] text-ink">
            <div>Protocolo <b className="font-mono">{d.protocolo}</b> · dados recebidos em {fmt(d.recebidaEm)} · proposta {d.proposta}</div>
            <div className="text-muted">Contato informado: {d.telefone || "sem telefone"} · {d.email || "sem e-mail"}</div>
            {d.status === "revisao" && <div className="text-muted">Revise e edite à vontade (salva sozinho). Os campos que ela não preencheu aparecem <span className="rounded bg-[#fff1c2] px-1">[assim]</span>. Ao gerar ou enviar o link, o texto fica travado.</div>}
            {d.status === "enviada" && (
              <div className="flex flex-wrap items-center gap-2 text-sky-900">
                🔒 Link de assinatura {d.linkEnviadoEm ? `enviado em ${fmt(d.linkEnviadoEm)}` : "gerado"}: <a className="font-semibold underline" href={d.link ?? "#"} target="_blank" rel="noreferrer">{d.link}</a>
                <button className="font-semibold text-navy underline" onClick={() => acao("reabrir", "reabrir")}>Reabrir para editar</button>
              </div>
            )}
            {d.status === "assinada" && (
              <div className="flex flex-wrap items-center gap-2 text-emerald-800">
                ✓ Assinada em {fmt(d.assinadaEm)}{d.assinante ? ` · ${d.assinante}` : ""}
                {d.temPdfAssinado && <a className="font-semibold underline" href={`/api/letters/${id}/minuta/pdf?assinada=1`} target="_blank" rel="noreferrer">Baixar PDF assinado</a>}
                <a className="text-muted underline" href="https://validar.iti.gov.br" target="_blank" rel="noreferrer">validar assinatura no ITI</a>
              </div>
            )}
          </div>
        )}
        {msg && <div className={`mb-3 rounded border-l-[3px] px-3 py-2 text-[13px] ${msg.tipo === "ok" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-rose-500 bg-rose-50 text-rose-800"}`}>{msg.txt}</div>}

        {editavel && (
          <div className="sticky top-[64px] z-30 mb-2 flex flex-wrap items-center gap-0.5 rounded-md border border-line bg-white p-1 shadow-sm">
            <B t="Negrito (Ctrl+B)" on={() => cmd("bold")}><b>N</b></B>
            <B t="Itálico (Ctrl+I)" on={() => cmd("italic")}><i>I</i></B>
            <B t="Sublinhado (Ctrl+U)" on={() => cmd("underline")}><u>S</u></B>
            <span className="mx-1 h-5 w-px bg-line" />
            <select title="Tamanho do texto" disabled={!editavel} className="h-8 rounded border border-line px-1 text-[12.5px] text-navy" value="" onMouseDown={(e) => e.stopPropagation()} onChange={(e) => { cmd("fontSize", e.target.value); e.target.value = ""; }}>
              <option value="">Tamanho</option>
              <option value="2">Pequeno</option>
              <option value="3">Normal</option>
              <option value="4">Grande</option>
              <option value="5">Maior</option>
            </select>
            <B t="Texto azul" on={() => cmd("foreColor", "#122A45")}><span style={{ color: "#122A45" }}>A</span></B>
            <B t="Texto dourado" on={() => cmd("foreColor", "#A2782F")}><span style={{ color: "#A2782F" }}>A</span></B>
            <B t="Texto preto" on={() => cmd("foreColor", "#1f2a37")}><span style={{ color: "#1f2a37" }}>A</span></B>
            <B t="Marca-texto" on={() => cmd("hiliteColor", "#fff1c2")}><span className="bg-[#fff1c2] px-0.5">A</span></B>
            <span className="mx-1 h-5 w-px bg-line" />
            <B t="Alinhar à esquerda" on={() => cmd("justifyLeft")}>⟸</B>
            <B t="Centralizar" on={() => cmd("justifyCenter")}>≡</B>
            <B t="Alinhar à direita" on={() => cmd("justifyRight")}>⟹</B>
            <B t="Justificar" on={() => cmd("justifyFull")}>☰</B>
            <span className="mx-1 h-5 w-px bg-line" />
            <B t="Lista com marcadores" on={() => cmd("insertUnorderedList")}>•</B>
            <B t="Lista numerada" on={() => cmd("insertOrderedList")}>1.</B>
            <B t="Limpar formatação" on={() => cmd("removeFormat")}>⌫</B>
            <span className="mx-1 h-5 w-px bg-line" />
            <B t="Desfazer (Ctrl+Z)" on={() => cmd("undo")}>↶</B>
            <B t="Refazer (Ctrl+Y)" on={() => cmd("redo")}>↷</B>
            <button type="button" className="ml-auto px-2 text-[12px] font-semibold text-muted hover:text-navy" onClick={() => acao("restaurar", "restaurar")}>Voltar ao texto original</button>
          </div>
        )}

        <div className="rounded-md border border-line bg-white px-6 py-8 shadow-[0_24px_60px_-40px_rgba(18,42,69,.5)] sm:px-12 sm:py-12">
          <div ref={area} className="minuta outline-none" contentEditable={editavel} suppressContentEditableWarning spellCheck onInput={mudou} />
        </div>
      </div>
    </div>
  );
}
