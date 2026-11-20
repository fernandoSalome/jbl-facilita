"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAPEIS } from "@/lib/captacao";
import { chamar } from "./chamar";

type C = { id: string; nome: string; telefone: string; papel: string };
type M = { id: string; telefone: string; nome: string; deMim: boolean; texto: string; quando: string };

const RAPIDAS = ["Pode me mandar a matrícula atualizada?", "Pode mandar fotos da área?", "Tem córrego ou nascente com água o ano todo?", "Qual o tamanho exato da área?", "Por onde se entra na área?"];

/** Chat com as conversas ligadas, abaixo do KMZ (pedido 19/11/2026): abas por pessoa, perguntas rápidas e envio */
export default function ChatArea({ id, conversas, mensagens }: { id: string; conversas: C[]; mensagens: M[] }) {
  const router = useRouter();
  const [aba, setAba] = useState(conversas[0]?.id ?? "");
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState("");
  const c = conversas.find((x) => x.id === aba);
  if (!c) return <section className="card p-5 text-sm text-muted">Nenhuma conversa ligada. Ligue o proprietário ou o corretor em Configurações.</section>;
  const lista = mensagens.filter((m) => m.telefone === c.telefone);
  async function enviar(t: string) {
    if (!t.trim()) return;
    try {
      await chamar(`/api/areas/${id}/mensagens`, "POST", { conversaId: c!.id, texto: t });
      setTexto("");
      setMsg("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap gap-1 border-b border-line bg-surface px-3 pt-2">
        {conversas.map((x) => (
          <button key={x.id} onClick={() => setAba(x.id)} className={`rounded-t px-3 py-1.5 text-[13px] font-semibold ${x.id === aba ? "bg-white text-navy" : "text-muted hover:text-navy"}`}>
            {x.nome} <span className="text-[11px] font-normal text-muted">· {PAPEIS[x.papel] ?? x.papel}</span>
          </button>
        ))}
      </div>
      <div className="grid max-h-[360px] gap-2 overflow-auto bg-alt p-4">
        {lista.map((m) => (
          <div key={m.id} className={`max-w-[80%] rounded-md px-3 py-2 text-[14px] ${m.deMim ? "ml-auto bg-navy text-white" : "border border-line bg-white"}`}>
            {m.texto}
            <div className={`mt-0.5 text-[11px] ${m.deMim ? "text-white/60" : "text-muted"}`}>{new Date(m.quando).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        ))}
        {!lista.length && <p className="text-center text-[13px] text-muted">As mensagens aparecem aqui depois que a conversa é ligada e o WhatsApp está conectado.</p>}
      </div>
      <div className="border-t border-line p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">{RAPIDAS.map((r) => <button key={r} className="rounded-full border border-gold-line bg-gold-soft px-2.5 py-0.5 text-[12px] text-gold-ink hover:border-gold" onClick={() => setTexto(r)}>{r}</button>)}</div>
        <div className="flex gap-2">
          <input className="input" placeholder={`Mensagem para ${c.nome}`} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enviar(texto)} />
          <button className="btn-gold shrink-0" onClick={() => enviar(texto)}>Enviar</button>
        </div>
        {msg && <p className="mt-1 text-[12.5px] font-semibold text-rose-700">{msg}</p>}
      </div>
    </section>
  );
}
