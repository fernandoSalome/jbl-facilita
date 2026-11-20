"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { chamar } from "@/components/captacao/chamar";

/** Conversas no formato do WhatsApp (pedido 20/11/2026): lista à esquerda, mensagens à direita, responder e ligar à área */

export type ItemConversa = {
  telefone: string;
  nome: string;
  /** "Terrenista", "Corretor"… ou a área ligada */
  sub: string;
  ultima: string | null;
  quando: string | null;
  contatoId: string | null;
  areas: { id: string; titulo: string }[];
};
export type Mensagem = { id: string; deMim: boolean; texto: string; quando: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Cabecalho({ c, resumo, todasAreas }: { c: ItemConversa; resumo: string | null; todasAreas: { id: string; titulo: string }[] }) {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const agir = async (corpo: Record<string, unknown>, depois?: () => void) => {
    setBusy(true);
    try { await chamar("/api/contatos-terra", "PATCH", { id: c.contatoId, ...corpo }); depois?.(); router.refresh(); } catch (e) { alert((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-5 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold font-display text-navy">{c.nome[0]}</span>
      <div className="min-w-0 flex-1 basis-64">
        <b className="text-navy">{c.nome}</b> <span className="text-[12px] text-muted">{c.sub} · +{c.telefone}</span>
        {resumo && <p className="text-[13px] text-navy">{resumo}</p>}
        {c.areas.length > 0 && (
          <p className="text-[12.5px]">{c.areas.map((a) => <Link key={a.id} className="mr-2 font-semibold text-gold-deep underline" href={`/app/captacao/${a.id}`}>📍 {a.titulo}</Link>)}</p>
        )}
      </div>
      {c.contatoId && (
        <div className="flex flex-wrap items-center gap-1.5">
          <select className="input w-48 py-1 text-[13px]" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">{c.areas.length ? "Ligar a outra área…" : "Ligar a uma área…"}</option>
            {todasAreas.filter((a) => !c.areas.some((x) => x.id === a.id)).map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
          </select>
          <button className="btn-gold py-1 text-[12.5px]" disabled={busy || !area} onClick={() => agir({ acao: "ligar", areaId: area }, () => setArea(""))}>Ligar</button>
          {!c.areas.length && <button className="btn-ghost py-1 text-[12.5px]" disabled={busy} onClick={() => confirm("Tirar este contato? A conversa guardada é apagada e ele não volta mais.") && agir({ acao: "fora" }, () => router.push("/app/conversas"))}>Não é de terra</button>}
        </div>
      )}
    </div>
  );
}

function Responder({ telefone }: { telefone: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar() {
    if (!texto.trim()) return;
    setBusy(true);
    try {
      await chamar("/api/contatos-terra/enviar", "POST", { telefone, texto });
      setTexto("");
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  }
  return (
    <div className="flex items-end gap-2 border-t border-line bg-white p-3">
      <textarea className="input min-h-[44px] flex-1 resize-none" rows={2} value={texto} placeholder="Escreva a mensagem (Enter envia, Shift+Enter quebra linha)"
        onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
      <button className="btn-gold" disabled={busy || !texto.trim()} onClick={enviar}>{busy ? "Enviando…" : "Enviar"}</button>
    </div>
  );
}

export default function Inbox({ lista, atual, resumo, mensagens, areas, pendentes }: {
  lista: ItemConversa[]; atual: ItemConversa | null; resumo: string | null; mensagens: Mensagem[]; areas: { id: string; titulo: string }[]; pendentes: number;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const filtrada = useMemo(() => {
    const q = norm(busca.trim());
    return q ? lista.filter((c) => norm(`${c.nome} ${c.telefone} ${c.sub}`).includes(q)) : lista;
  }, [lista, busca]);
  // chaves: o Chrome novo devolve uma Promise no scrollIntoView, e efeito não pode devolver nada além de função
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens.length, atual?.telefone]);
  // mensagens novas chegam pelo WhatsApp: atualiza a cada 20 s
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <div className="grid h-[calc(100vh-150px)] min-h-[520px] grid-cols-[minmax(260px,340px)_minmax(0,1fr)] overflow-hidden rounded-md border border-line bg-white">
      <aside className="flex min-h-0 flex-col border-r border-line">
        <div className="grid gap-2 border-b border-line p-3">
          <input className="input py-1.5 text-[13px]" type="search" placeholder="🔎 Buscar nome ou número" value={busca} onChange={(e) => setBusca(e.target.value)} />
          {pendentes > 0 && <p className="text-[12px] text-muted">{pendentes} conversa(s) esperando o Claude ler.</p>}
          <p className="text-[11.5px] text-muted">Lê o WhatsApp sozinho a cada 20 minutos (conversas, áudios e quem é de terra).</p>
        </div>
        <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
          {filtrada.map((c) => (
            <Link key={c.telefone} href={`/app/conversas?c=${c.telefone}`} className={`flex gap-3 px-3 py-2.5 hover:bg-gold-soft ${atual?.telefone === c.telefone ? "bg-gold-soft" : ""}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display ${c.areas.length ? "bg-navy text-gold" : "bg-gold text-navy"}`}>{c.nome[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2"><b className="truncate text-[14px] text-navy">{c.nome}</b><span className="ml-auto shrink-0 text-[11px] text-muted">{c.quando ?? ""}</span></span>
                <span className="block truncate text-[12px] text-muted">{c.sub}</span>
                <span className="block truncate text-[12.5px] text-muted">{c.ultima ?? "sem mensagens"}</span>
              </span>
            </Link>
          ))}
          {!filtrada.length && <p className="px-4 py-8 text-center text-sm text-muted">Nenhuma conversa de terra ainda.</p>}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col bg-surface">
        {atual ? (
          <>
            <Cabecalho c={atual} resumo={resumo} todasAreas={areas} />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="grid gap-1.5">
                {mensagens.map((m) => (
                  <div key={m.id} className={`max-w-[75%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[14px] shadow-sm ${m.deMim ? "justify-self-end bg-gold-soft text-navy" : "justify-self-start bg-white text-navy"}`}>
                    {m.texto}
                    <span className="mt-0.5 block text-right text-[10.5px] text-muted">{hora(m.quando)}</span>
                  </div>
                ))}
                {!mensagens.length && <p className="py-10 text-center text-sm text-muted">Nenhuma mensagem guardada desta conversa.</p>}
                <div ref={fim} />
              </div>
            </div>
            <Responder telefone={atual.telefone} />
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted">Escolha uma conversa à esquerda.</div>
        )}
      </section>
    </div>
  );
}
