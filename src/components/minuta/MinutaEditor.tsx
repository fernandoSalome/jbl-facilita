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
  cpf: string;
  avisos: string[];
  emailConfigurado: boolean;
  html: string;
  editada: boolean;
  status: "revisao" | "enviada" | "assinada";
  link: string | null;
  linkEnviadoEm: string | null;
  assinadaEm: string | null;
  assinante: string | null;
  temPdfAssinado: boolean;
  autentiqueConfigurado: boolean;
  erroAutentique: string | null;
  assinaturas: Assinante[];
};

type Assinante = { papel: string; papelNome: string; nome: string; link: string | null; vistoEm: string | null; assinadoEm: string | null; recusadoEm: string | null; motivo: string | null };

/** Situação de cada pessoa que assina */
function Situacao({ a }: { a: Assinante }) {
  if (a.assinadoEm) return <span className="rounded bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-800 ring-1 ring-emerald-200">✓ Assinou em {fmt(a.assinadoEm)}</span>;
  if (a.recusadoEm) return <span className="rounded bg-rose-50 px-2 py-0.5 text-[12px] font-semibold text-rose-800 ring-1 ring-rose-200">Recusou em {fmt(a.recusadoEm)}{a.motivo ? `: ${a.motivo}` : ""}</span>;
  if (a.vistoEm) return <span className="rounded bg-sky-50 px-2 py-0.5 text-[12px] font-semibold text-sky-800 ring-1 ring-sky-200">Abriu em {fmt(a.vistoEm)}, falta assinar</span>;
  return <span className="rounded bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800 ring-1 ring-amber-200">Aguardando</span>;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "");

/**
 * Editor da minuta, parecido com um Word: negrito, itálico, sublinhado, tamanho, cor,
 * alinhamento e listas. Salva sozinho. Ao mandar para assinatura (Autentique), o texto fica travado.
 */
export default function MinutaEditor({ id }: { id: string }) {
  const [d, setD] = useState<Dados | null>(null);
  const [salvo, setSalvo] = useState<"ok" | "salvando" | "erro">("ok");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; txt: string } | null>(null);
  const [ocupado, setOcupado] = useState("");
  const [contato, setContato] = useState<{ telefone: string; email: string; cpf: string } | null>(null);

  async function salvarContato() {
    if (!contato) return;
    setOcupado("contato");
    setMsg(null);
    try {
      const r = await fetch(`/api/letters/${id}/minuta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "contato", ...contato }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível salvar.");
      setContato(null);
      setMsg({ tipo: "ok", txt: "Contato corrigido." });
      await carregar();
    } catch (e) {
      setMsg({ tipo: "erro", txt: e instanceof Error ? e.message : String(e) });
    } finally {
      setOcupado("");
    }
  }
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

  async function acao(a: "link" | "whatsapp" | "email" | "reabrir" | "restaurar" | "atualizar", rotulo: string) {
    if (a === "reabrir" && !confirm("Reabrir para editar? O pedido de assinatura na Autentique é cancelado e será preciso mandar um novo link.")) return;
    if (a === "restaurar" && !confirm("Voltar ao texto montado com os dados que ela enviou? As suas alterações serão perdidas.")) return;
    if ((a === "link" || a === "whatsapp" || a === "email") && d?.status === "revisao" && !confirm("Ao enviar, o texto fica travado nesta versão e vai para a Autentique (é o que será assinado). Continuar?")) return;
    // campos em branco ([RG], [endereço]...) iriam assim para a assinatura
    const lacunas = d?.status === "revisao" ? [...(area.current?.querySelectorAll(".lacuna") ?? [])].map((x) => x.textContent).filter(Boolean) : [];
    if ((a === "link" || a === "whatsapp" || a === "email") && lacunas.length && !confirm(`Ainda tem campos em branco no texto: ${[...new Set(lacunas)].join(", ")}.\nEles vão assim para a assinatura. Enviar mesmo assim?`)) return;
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
      } else if (a === "atualizar") {
        setMsg({ tipo: "ok", txt: j.status === "assinada" ? "Assinada por todos. O PDF assinado já está aqui." : "Situação atualizada." });
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
            {d?.status === "enviada" && <button className="btn-ghost" disabled={!!ocupado} onClick={() => acao("atualizar", "atualizar")}>{ocupado === "atualizar" ? "Conferindo…" : "↻ Atualizar situação"}</button>}
            {d?.status === "revisao" && <button className="btn-ghost" disabled={!!ocupado || !d.autentiqueConfigurado} onClick={() => acao("link", "link")}>Copiar link de assinatura</button>}
            {d && d.status !== "assinada" && (
              <>
                <button className="btn-ghost" disabled={!!ocupado || !d.email || !d.emailConfigurado || !d.autentiqueConfigurado} title={!d.email ? "Ela não informou e-mail" : !d.emailConfigurado ? "Envio por e-mail ainda não configurado" : `Enviar para ${d.email}`} onClick={() => acao("email", "email")}>{d.status === "enviada" ? "Reenviar por e-mail" : "Enviar por e-mail"}</button>
                <button className="btn-gold" disabled={!!ocupado || !d.telefone || !d.autentiqueConfigurado} title={d.telefone ? `Enviar para ${d.telefone}` : "Ela não informou telefone"} onClick={() => acao("whatsapp", "whatsapp")}>{ocupado === "whatsapp" ? "Enviando…" : d.status === "enviada" ? "Reenviar no WhatsApp" : "Enviar para assinar no WhatsApp"}</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[920px] px-4 py-5 sm:px-6">
        {d && (
          <div className="mb-3 grid gap-1 rounded border border-line bg-white px-4 py-3 text-[13px] text-ink">
            <div>Protocolo <b className="font-mono">{d.protocolo}</b> · dados recebidos em {fmt(d.recebidaEm)} · proposta {d.proposta}</div>
            {contato ? (
              <div className="flex flex-wrap items-end gap-2">
                <label className="grid text-[12px] text-muted">Celular<input className="input h-8 w-44 py-1" value={contato.telefone} onChange={(e) => setContato({ ...contato, telefone: e.target.value })} placeholder="(11) 94009-1744" /></label>
                <label className="grid text-[12px] text-muted">E-mail<input className="input h-8 w-64 py-1" value={contato.email} onChange={(e) => setContato({ ...contato, email: e.target.value })} /></label>
                <label className="grid text-[12px] text-muted">CPF<input className="input h-8 w-40 py-1" value={contato.cpf} onChange={(e) => setContato({ ...contato, cpf: e.target.value })} /></label>
                <button className="btn-navy h-8 py-0" disabled={!!ocupado} onClick={salvarContato}>{ocupado === "contato" ? "Salvando…" : "Salvar"}</button>
                <button className="h-8 px-2 text-[12.5px] font-semibold text-muted hover:text-navy" onClick={() => setContato(null)}>Cancelar</button>
              </div>
            ) : (
              <div className="text-muted">
                Contato informado: {d.telefone || "sem telefone"} · {d.email || "sem e-mail"}{d.cpf ? ` · CPF ${d.cpf}` : ""}
                {d.status === "revisao" && <button className="ml-2 font-semibold text-navy underline" onClick={() => setContato({ telefone: d.telefone, email: d.email, cpf: d.cpf })}>corrigir</button>}
              </div>
            )}
            {d.avisos.map((a) => <div key={a} className="rounded bg-amber-50 px-3 py-1.5 text-amber-900 ring-1 ring-amber-200">⚠ {a}</div>)}
            {d.status === "revisao" && (
              <ol className="mt-1 grid gap-0.5 text-muted">
                <li><b className="text-navy">1. Revise o texto.</b> Edite à vontade (salva sozinho). O que ela não preencheu aparece <span className="rounded bg-[#fff1c2] px-1">[assim]</span>.</li>
                <li><b className="text-navy">2. Envie no WhatsApp ou por e-mail.</b> O texto trava nesta versão e vai para a Autentique (assinatura eletrônica com validade jurídica).</li>
                <li><b className="text-navy">3. Ela assina pelo celular:</b> abre o link, confere, toca em Assinar, confirma o CPF e digita o código que chega por SMS. Não precisa de gov.br.</li>
                <li><b className="text-navy">4. Pronto:</b> quando todos assinarem, o PDF assinado aparece aqui e é enviado no grupo e no WhatsApp dela.</li>
              </ol>
            )}
            {d.status !== "assinada" && !d.autentiqueConfigurado && (
              <div className="mt-1 rounded bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200">A Autentique ainda não foi ligada ao sistema: falta colocar a chave <b>AUTENTIQUE_TOKEN</b> na Vercel. Até lá, dá para revisar e baixar o PDF.</div>
            )}
            {d.erroAutentique && <div className="mt-1 rounded bg-rose-50 px-3 py-2 text-rose-800 ring-1 ring-rose-200">Não foi possível conferir na Autentique agora: {d.erroAutentique}</div>}
            {d.status === "enviada" && (
              <div className="flex flex-wrap items-center gap-2 text-sky-900">
                🔒 Enviada para assinatura na Autentique{d.linkEnviadoEm ? ` (link mandado em ${fmt(d.linkEnviadoEm)})` : ""}. Link dela: <a className="font-semibold underline" href={d.link ?? "#"} target="_blank" rel="noreferrer">{d.link}</a>
                <button className="font-semibold text-navy underline" onClick={() => acao("reabrir", "reabrir")}>Reabrir para editar</button>
              </div>
            )}
            {d.status === "assinada" && (
              <div className="flex flex-wrap items-center gap-2 text-emerald-800">
                ✓ Assinada por todos em {fmt(d.assinadaEm)}
                {d.temPdfAssinado && <a className="font-semibold underline" href={`/api/letters/${id}/minuta/pdf?assinada=1`} target="_blank" rel="noreferrer">Baixar PDF assinado</a>}
                <span className="text-muted">(a última página do PDF é a verificação da Autentique: data, hora, IP e confirmação de cada pessoa)</span>
              </div>
            )}
            {d.status !== "revisao" && d.assinaturas.length > 0 && (
              <div className="mt-1.5 grid gap-1.5 border-t border-line pt-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Quem assina</div>
                {d.assinaturas.map((a) => (
                  <div key={a.nome + a.papel} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-[180px] font-semibold text-navy">{a.nome} <span className="font-normal text-muted">· {a.papelNome}</span></span>
                    <Situacao a={a} />
                    {d.status === "enviada" && !a.assinadoEm && a.link && d.link && (
                      <button className="text-[12px] font-semibold text-navy underline" onClick={() => { const l = a.papel === "proprietario" ? d.link! : `${d.link}?p=${a.papel}`; navigator.clipboard?.writeText(l).catch(() => {}); setMsg({ tipo: "ok", txt: `Link de ${a.nome} copiado: ${l}` }); }}>copiar link</button>
                    )}
                  </div>
                ))}
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
