"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_INPUTS } from "@/lib/calc";
import { DEFAULT_OPTIONS } from "@/lib/proposals";
import { CAMPOS_MSG, MSG_KEY, MSG_PADRAO, montarMensagem, saudacao } from "@/lib/mensagem";
import {
  aplicarDiff,
  chaveDoTipo,
  estavel,
  FORMATOS,
  idsDoTipo,
  juntar,
  mesclarComum,
  type ComumContent,
  type Conflito,
  type FormatoContent,
  type FormatoKey,
  type ObraItem,
  type Qtd,
  type TipoContent,
} from "@/lib/formatos";
import Modal from "@/components/ui/Modal";
import JblPadrao from "./JblPadrao";
import ModoToggle from "./ModoToggle";
import DestinatarioPicker from "@/components/proposals/DestinatarioPicker";
import type { Destinatario } from "@/lib/proposals";

/**
 * Editor do template base. Os textos, imagens e cores são os mesmos nos 4 tipos de
 * loteamento; trocar o tipo muda só infraestrutura, benfeitorias, lei, modelo e padrões.
 * Aqui nada salva sozinho: as alterações (de todos os tipos) ficam num rascunho até
 * clicar em "Salvar", que pergunta se vale para as propostas já feitas ou só para as próximas.
 */

type F = { key: FormatoKey; content: FormatoContent; createdAt: string };
type Draft = { comum: ComumContent; tipos: Record<FormatoKey, TipoContent> };

const PROJETO_EXEMPLO = { name: "Gleba Exemplo", tipo: "", municipio: "Martinópolis", uf: "SP", matricula: "00.000", aerialImage: "/demo/sao-judas-tadeu-ii.jpg" };
const HOJE = new Date().toISOString();

const clone = <T,>(c: T): T => JSON.parse(JSON.stringify(c));

/** Texto de um override para mostrar na lista de conferência */
function previa(v: unknown) {
  if (typeof v !== "string") return "(imagem, cor ou ajuste visual)";
  const t = v.replace(/^html:/, "").replace(/<br[^>]*>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\{\{(\w+)\}\}/g, "[$1]");
  return t.length > 260 ? `${t.slice(0, 260)}…` : t;
}

export default function TemplateEditor({
  templateId,
  templateName,
  formatos,
  counts,
  inicial,
  propostas,
}: {
  templateId: string;
  templateName: string;
  formatos: F[];
  counts: Record<string, { total: number; enviadas: number }>;
  inicial: FormatoKey;
  /** bloqueada: proposta travada para edição (não muda ao salvar o template) */
  propostas: { id: string; name: string; status: string; formato: string; projeto: string; bloqueada?: boolean }[];
}) {
  const router = useRouter();
  const [key, setKey] = useState<FormatoKey>(inicial);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Estado salvo: parte compartilhada + parte de cada tipo. Só muda quando o que está
  // gravado muda (depois de salvar), não a cada nova renderização da página.
  const assinatura = estavel(formatos);
  const salvo = useMemo(() => {
    const m = mesclarComum(formatos.map((f) => ({ formato: f.key, content: f.content, createdAt: f.createdAt })));
    const registrados = formatos.find((f) => f.content.conflitos?.length)?.content.conflitos ?? [];
    const draft: Draft = { comum: m.comum, tipos: m.tipos };
    return { draft, conflitos: m.conflitos.length ? m.conflitos : registrados };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura]);

  const [draft, setDraft] = useState<Draft>(() => clone(salvo.draft));
  useEffect(() => setDraft(clone(salvo.draft)), [salvo]);

  const comumMudou = estavel(draft.comum) !== estavel(salvo.draft.comum);
  const tiposMudaram = FORMATOS.filter((f) => estavel(draft.tipos[f]) !== estavel(salvo.draft.tipos[f]));
  const dirty = comumMudou || tiposMudaram.length > 0;
  const conflitos = salvo.conflitos;

  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // propostas que também mudam ao salvar: rascunhos marcados; as já enviadas ficam protegidas (desmarcadas)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const rascunhos = useMemo(() => propostas.filter((p) => p.status === "rascunho").map((p) => p.id), [propostas]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [verConflitos, setVerConflitos] = useState(true);
  const [naoAchou, setNaoAchou] = useState("");

  // aviso do navegador ao fechar a aba ou recarregar com alterações pendentes
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const guard = (go: () => void) => (dirty ? setLeaving(() => go) : go());

  const update = useCallback((fn: (d: Draft) => void) => {
    setDraft((d) => {
      const n = clone(d);
      fn(n);
      return n;
    });
  }, []);

  // As edições feitas na página vão para o rascunho: o que é do tipo (listas, quantidades,
  // textos e emojis dos itens) vai para o tipo selecionado; o resto vale para todos os tipos.
  const [dest, setDest] = useState<Destinatario>({ tipo: "familia" });
  const onSave = useCallback(
    async (k: string, v: unknown) => {
      update((d) => {
        const t = d.tipos[keyRef.current];
        if (k.startsWith("lista.")) {
          const secao = k.slice(6) as "infra" | "complementar" | "benfeitorias" | "contatos";
          if (secao === "contatos") d.comum.contatos = aplicarDiff(d.comum.contatos, v);
          else (t as unknown as Record<string, unknown>)[secao] = aplicarDiff(t[secao] as { id: string }[], v);
        } else if (k.startsWith("liq.")) {
          const item = [...t.infra, ...t.complementar].find((i) => i.id === k.slice(4)) as ObraItem | undefined;
          if (item && v) item.qtd = v as Qtd;
        } else {
          const alvo = chaveDoTipo(k, idsDoTipo(t)) ? t.overrides : d.comum.overrides;
          if (v === null) delete alvo[k];
          else alvo[k] = v;
        }
      });
    },
    [update],
  );

  const tipo = draft.tipos[key];
  const junto = useMemo(() => juntar(draft.comum, tipo), [draft.comum, tipo]);
  const formato = useMemo(() => ({ ...junto, overrides: {} }), [junto]);
  // primeira etapa ligada no exemplo, para os textos dela poderem ser editados no template
  const inputs = useMemo(() => ({ ...DEFAULT_INPUTS, areaTotal: 137338.46, primeiraEtapa: true, areaEtapa1: 42552, ...tipo.padroes }), [tipo.padroes]);
  const total = FORMATOS.reduce((s, f) => s + (counts[f]?.total ?? 0), 0);
  const enviadas = FORMATOS.reduce((s, f) => s + (counts[f]?.enviadas ?? 0), 0);
  const nomeTipo = (f: FormatoKey) => draft.tipos[f].label;

  async function salvar() {
    // nenhuma opção vem marcada: precisa escolher onde o template vai valer
    const enviadasMarcadas = propostas.filter((p) => p.status !== "rascunho" && marcadas.has(p.id)).length;
    if (enviadasMarcadas && !confirm(`${enviadasMarcadas} proposta(s) já enviada(s) vão mudar: o cliente vai ver as mudanças no link. Continuar?`)) return;
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/templates/${templateId}/salvar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comum: draft.comum, tipos: draft.tipos, aplicar: "selecionadas", propostas: [...marcadas] }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(d.error ?? "Não foi possível salvar.");
    setSaveOpen(false);
    setMsg(d.atualizadas ? `✓ Template salvo: vale para as próximas propostas e foi aplicado em ${d.atualizadas} proposta(s)` : "✓ Template salvo. Vale para as próximas propostas; as que já existem ficaram como estavam");
    router.refresh();
  }

  function mostrar(k: string) {
    setMode("edit");
    setNaoAchou("");
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-k="${CSS.escape(k)}"]`);
      if (!el) return setNaoAchou(k);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.animate([{ boxShadow: "0 0 0 4px #e0a800" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1600 });
    });
  }

  const P = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="grid gap-1 text-[12px] font-semibold text-navy">{label}{children}</label>
  );
  const setTipo = (fn: (t: TipoContent) => void) => update((d) => fn(d.tipos[key]));

  return (
    <div className="min-h-screen bg-alt">
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <button onClick={() => guard(() => router.push("/app/templates"))} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-navy hover:bg-alt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Voltar
          </button>
          <span className="h-6 w-px bg-line" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
              Template ·{" "}
              {mode === "edit" ? <span className="text-navy">✎ visto como editor</span> : <span className="text-emerald-700">👁 visto como cliente</span>}
            </div>
            <h1 className="h-display text-lg leading-tight">{templateName}</h1>
          </div>
          {/* fica na barra fixa: troca o modo em qualquer ponto da página, sem voltar ao topo */}
          <ModoToggle mode={mode} onChange={setMode} />
          <label className="ml-4 flex items-center gap-2 text-[13px] font-semibold text-navy">
            Tipo de loteamento
            <select
              value={key}
              onChange={(e) => {
                const next = e.target.value as FormatoKey;
                setKey(next);
                // só atualiza o endereço (sem recarregar): fica no mesmo ponto da página e o rascunho continua
                window.history.replaceState(null, "", `/app/modelo/${templateId}?formato=${next}`);
              }}
              className="input w-auto py-1.5"
            >
              {FORMATOS.map((f) => <option key={f} value={f}>{nomeTipo(f)}{tiposMudaram.includes(f) ? " •" : ""}</option>)}
            </select>
          </label>
          <span className="text-[12px] text-muted">{total} proposta(s) usam este template</span>

          <div className="ml-auto flex items-center gap-2">
            {msg && <span className="text-[12.5px] font-semibold text-emerald-700">{msg}</span>}
            {dirty && <span className="rounded-sm bg-[#fff6d6] px-2 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-[#e0a800]">● Alterações não salvas</span>}
            {dirty && <button className="btn-ghost" onClick={() => setDraft(clone(salvo.draft))}>Descartar</button>}
            <button className="btn-gold px-6" disabled={!dirty && !conflitos.length} onClick={() => { setMsg(""); setMarcadas(new Set(rascunhos)); setSaveOpen(true); }}>Salvar</button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12 pt-5">
        {conflitos.length > 0 && (
          <div className="mb-4 rounded-md border border-[#e0a800] bg-[#fffaf0] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="eyebrow">Confira: textos que estavam diferentes entre os tipos</div>
              <button className="text-[12.5px] font-semibold text-gold-deep hover:underline" onClick={() => setVerConflitos((v) => !v)}>{verConflitos ? "Esconder" : `Mostrar (${conflitos.length})`}</button>
            </div>
            {verConflitos && (
              <>
                <p className="mt-2 text-[13px] text-ink">
                  Agora os textos são os mesmos para todos os tipos de loteamento. Estes {conflitos.length} trecho(s) tinham sido alterados de forma diferente em mais de um tipo, e ficou valendo a alteração mais recente. Se preferir a outra versão, clique em “Usar esta”. Este aviso some quando você salvar o template.
                </p>
                <div className="mt-3 grid gap-3">
                  {conflitos.map((c: Conflito) => (
                    <div key={c.k} className="rounded border border-line bg-white p-3">
                      <div className="mb-2 flex items-center gap-3 text-[12px] text-muted">
                        <code className="rounded bg-alt px-1.5 py-0.5">{c.k}</code>
                        <button className="font-semibold text-gold-deep hover:underline" onClick={() => mostrar(c.k)}>Ver na página</button>
                        {naoAchou === c.k && <span>Não aparece com o destinatário escolhido acima (troque o destinatário para ver).</span>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {c.opcoes.map((o, i) => {
                          const emUso = estavel(draft.comum.overrides[c.k]) === estavel(o.valor);
                          return (
                            <div key={i} className={`rounded border p-2.5 text-[13px] ${emUso ? "border-gold bg-gold-soft" : "border-line"}`}>
                              <div className="mb-1 flex items-center justify-between gap-2 text-[11.5px] font-semibold text-muted">
                                <span>Alterado em {nomeTipo(o.formato)}{i === 0 ? " · mais recente" : ""}</span>
                                {emUso ? (
                                  <span className="text-gold-deep">✓ Em uso</span>
                                ) : (
                                  <button className="btn-ghost py-0.5 text-[11.5px]" onClick={() => update((d) => void (d.comum.overrides[c.k] = o.valor))}>Usar esta</button>
                                )}
                              </div>
                              <div className="text-ink">{previa(o.valor)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mb-4 rounded-md border border-line bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="eyebrow">Só deste tipo: {tipo.label}</div>
            <span className="text-[12px] text-muted">Nome, lei e modelo mudam só neste tipo. Na página, infraestrutura e benfeitorias também. O resto do texto vale para todos os tipos.</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <P label="Nome do tipo"><input className="input py-1.5" value={tipo.label} onChange={(e) => setTipo((t) => void (t.label = e.target.value))} /></P>
            <P label="Modelo citado na carta"><input className="input py-1.5" value={tipo.modelo} onChange={(e) => setTipo((t) => void (t.modelo = e.target.value))} /></P>
            <P label="Lei"><input className="input py-1.5" value={tipo.lei} onChange={(e) => setTipo((t) => void (t.lei = e.target.value))} /></P>
          </div>
        </div>

        <MensagemWhatsapp
          valor={typeof draft.comum.overrides[MSG_KEY] === "string" ? (draft.comum.overrides[MSG_KEY] as string) : MSG_PADRAO}
          tipo={tipo.label}
          onChange={(v) =>
            update((d) => {
              // igual ao padrão (ou vazio): não grava nada, vale a mensagem padrão
              if (!v.trim() || v === MSG_PADRAO) delete d.comum.overrides[MSG_KEY];
              else d.comum.overrides[MSG_KEY] = v;
            })
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <DestinatarioPicker compact value={dest} onChange={setDest} />
          <span className="text-[12.5px] text-muted">
            Números de exemplo, que vêm da planilha: o valor não muda, mas dá para clicar e mudar negrito, itálico, cor e tamanho. Os textos valem para todos os tipos quando você salvar.
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_60px_-40px_rgba(18,42,69,.5)]">
          <JblPadrao
            key={mode}
            mode={mode}
            token="modelo"
            formato={formato}
            project={PROJETO_EXEMPLO}
            ownerName="Família"
            inputs={inputs}
            options={{ ...DEFAULT_OPTIONS, destinatario: dest }}
            overrides={junto.overrides}
            date={HOJE}
            onSave={onSave}
            tipoLabel={tipo.label}
          />
        </div>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        eyebrow={templateName}
        title="Salvar o template"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setSaveOpen(false)}>Cancelar</button>
            <button className="btn-gold" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar template"}</button>
          </>
        }
      >
        <div className="grid gap-3">
          <ul className="grid gap-1 rounded bg-alt px-3 py-2.5 text-[13px] text-ink">
            {comumMudou && <li>• <b>Textos, imagens e cores</b>: valem para os 4 tipos de loteamento.</li>}
            {tiposMudaram.map((f) => (
              <li key={f}>• <b>{nomeTipo(f)}</b>: infraestrutura, benfeitorias, lei ou padrões só deste tipo.</li>
            ))}
            {!dirty && conflitos.length > 0 && <li>• Confirma os textos unificados (o aviso de conferência some).</li>}
          </ul>
          <p className="text-[14px] font-semibold text-navy">Onde este template vai valer?</p>
          <p className="rounded bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900 ring-1 ring-emerald-200">✓ Sempre nas <b>propostas novas</b>, criadas daqui para frente.</p>
          {propostas.length > 0 && (
            <div className="rounded border border-line">
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-alt px-3 py-2 text-[13px]">
                <b className="text-navy">Propostas que já existem: marque as que também devem mudar</b>
                <span className="ml-auto flex gap-2 text-[12px]">
                  <button className="font-semibold text-navy underline" onClick={() => setMarcadas(new Set(rascunhos))}>só rascunhos</button>
                  <button className="font-semibold text-navy underline" onClick={() => setMarcadas(new Set())}>nenhuma</button>
                  <button className="font-semibold text-navy underline" onClick={() => setMarcadas(new Set(propostas.filter((p) => !p.bloqueada).map((p) => p.id)))}>todas</button>
                </span>
              </div>
              <div className="max-h-[38vh] overflow-y-auto">
                {propostas.map((p) => {
                  const enviada = p.status !== "rascunho";
                  const on = marcadas.has(p.id);
                  return (
                    <label key={p.id} className={`flex items-start gap-2.5 border-b border-line/70 px-3 py-2 text-[13px] last:border-0 ${p.bloqueada ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${on && enviada ? "bg-amber-50" : ""}`} title={p.bloqueada ? "Bloqueada para edição: não muda com o template. Libere na lista de propostas." : undefined}>
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-[#A2782F]"
                        disabled={p.bloqueada}
                        checked={on && !p.bloqueada}
                        onChange={(e) => setMarcadas((x) => { const n = new Set(x); if (e.target.checked) n.add(p.id); else n.delete(p.id); return n; })}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-navy">{p.name}</span> <span className="text-muted">· {p.projeto} · {nomeTipo(p.formato as FormatoKey)}</span>
                        <span className={`ml-1.5 inline-block rounded px-1.5 text-[11px] font-semibold ${enviada ? "bg-slate-100 text-slate-700" : "bg-gold-soft text-gold-ink"}`}>{enviada ? `🔒 ${p.status.replace("_", " ")}` : "rascunho"}</span>
                        {p.bloqueada && <span className="ml-1.5 inline-block rounded bg-rose-50 px-1.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200">bloqueada para edição</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {propostas.some((p) => p.status !== "rascunho" && marcadas.has(p.id)) && (
            <p className="rounded border-l-[3px] border-amber-500 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">⚠ Há proposta já enviada marcada: o cliente vai ver as mudanças no link.</p>
          )}
          <p className="text-[12.5px] text-muted">As desmarcadas ficam exatamente como estão. Dá para atualizar uma delas depois, dentro da própria proposta (aviso “versão anterior do template”). O que foi mudado dentro de cada proposta e os números da planilha dela continuam valendo.</p>
          {msg && <p className="text-sm font-semibold text-rose-700">{msg}</p>}
        </div>
      </Modal>

      <Modal
        open={!!leaving}
        onClose={() => setLeaving(null)}
        title="Sair sem salvar?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setLeaving(null)}>Continuar editando</button>
            <button className="btn-danger" onClick={() => { const go = leaving; setLeaving(null); setDraft(clone(salvo.draft)); go?.(); }}>Sair sem salvar</button>
          </>
        }
      >
        <p className="text-[15px]">Você tem alterações não salvas no template. Se sair agora, elas serão perdidas.</p>
      </Modal>
    </div>
  );
}

export function TemplateEditorLink({ id }: { id: string }) {
  return <Link href={`/app/modelo/${id}`} className="font-semibold text-gold-deep hover:underline">Editar template</Link>;
}

/**
 * Texto da mensagem de envio no WhatsApp. Vale para todos os tipos e todas as propostas
 * (a não ser na proposta em que alguém salvou um texto próprio). Os campos entre colchetes
 * são preenchidos em cada proposta.
 */
function MensagemWhatsapp({ valor, tipo, onChange }: { valor: string; tipo: string; onChange: (v: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const mudou = valor !== MSG_PADRAO;
  const exemplo = montarMensagem(valor, { saudacao: saudacao(), nome: "Família Silva", tipo, gleba: "Gleba Exemplo", link: "https://jbl-facilita.vercel.app/p/…" });

  // coloca o campo onde está o cursor
  function inserir(campo: string) {
    const el = ref.current;
    const ini = el?.selectionStart ?? valor.length;
    const fim = el?.selectionEnd ?? valor.length;
    onChange(valor.slice(0, ini) + campo + valor.slice(fim));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + campo.length, ini + campo.length);
    });
  }

  return (
    <div className="mb-4 rounded-md border border-line bg-white p-4">
      <button type="button" onClick={() => setAberto((a) => !a)} className="flex w-full flex-wrap items-center gap-3 text-left">
        <div className="eyebrow">Mensagem de envio no WhatsApp</div>
        <span className="text-[12px] text-muted">Vale para todos os tipos e todas as propostas.{mudou ? " Alterada." : ""}</span>
        <span className="ml-auto text-[13px] font-semibold text-navy">{aberto ? "Fechar ▲" : "Alterar ▼"}</span>
      </button>
      {aberto && (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <textarea
              ref={ref}
              className="block w-full resize-y rounded border-0 border-l-[3px] border-gold bg-alt px-4 py-3 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-gold-soft"
              rows={14}
              value={valor}
              onChange={(e) => onChange(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
              <span className="text-muted">Inserir campo:</span>
              {CAMPOS_MSG.map(([campo, explica]) => (
                <button key={campo} type="button" title={explica} onClick={() => inserir(campo)} className="rounded border border-gold-line bg-gold-soft px-2 py-0.5 font-semibold text-navy hover:border-gold">
                  {campo}
                </button>
              ))}
              {mudou && (
                <button type="button" onClick={() => onChange(MSG_PADRAO)} className="ml-auto font-semibold text-navy hover:underline">
                  ↺ Voltar à mensagem padrão
                </button>
              )}
            </div>
            <p className="mt-2 text-[12px] text-muted">Os campos entre colchetes são trocados pelos dados de cada proposta. *texto* fica em negrito no WhatsApp. Para valer, clique em Salvar no alto da página.</p>
          </div>
          <div>
            <div className="mb-1 text-[12px] font-semibold text-navy">Como chega (exemplo)</div>
            <div className="whitespace-pre-wrap rounded bg-[#E7F7E0] px-4 py-3 text-[13.5px] leading-relaxed text-ink">{exemplo}</div>
          </div>
        </div>
      )}
    </div>
  );
}
