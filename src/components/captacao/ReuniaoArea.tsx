"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

type P = { nome: string; email: string; telefone: string };
type R = { inicio: string; fim: string; local: string | null; status: string; convidadoNome: string | null; descricao: string | null } | null;

/** Reunião pela área: data, horário, local e um ou mais participantes; confirmada, mostra o card com "Alterar" */
export default function ReuniaoArea({ id, reuniao, sugestao }: { id: string; reuniao: R; sugestao: P[] }) {
  const router = useRouter();
  const ativa = reuniao && reuniao.status === "marcado" ? reuniao : null;
  const [editando, setEditando] = useState(!ativa);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("10:00");
  const [dur, setDur] = useState(60);
  const [local, setLocal] = useState("");
  const [ps, setPs] = useState<P[]>(sugestao.length ? sugestao : [{ nome: "", email: "", telefone: "" }]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const setP = (i: number, k: keyof P, v: string) => setPs(ps.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  async function confirmar() {
    setBusy(true);
    setMsg("");
    try {
      const inicio = new Date(`${dia}T${hora}:00-03:00`);
      const fim = new Date(+inicio + dur * 60e3);
      await chamar(`/api/areas/${id}/reuniao`, "POST", { inicio, fim, local, participantes: ps });
      setEditando(false);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  if (ativa && !editando) {
    const i = new Date(ativa.inicio);
    return (
      <section className="card border-2 border-emerald-300 p-5 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <b className="text-lg text-navy">✅ Reunião confirmada</b>
          <span>{i.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="flex-1" />
          <button className="btn-ghost py-1.5 text-[13px]" onClick={() => setEditando(true)}>Alterar</button>
        </div>
        <p className="mt-2">📍 {ativa.local || "local a combinar"} · com {ativa.convidadoNome}{ativa.descricao ? ` · ${ativa.descricao}` : ""}</p>
        <p className="mt-1 text-[12.5px] text-muted">Está no calendário. O convidado recebeu o convite por e-mail, e o JBL - Avisos avisa 1 dia antes e 1 hora antes.</p>
      </section>
    );
  }
  return (
    <section className="card p-5">
      <h3 className="eyebrow mb-3">{ativa ? "Remarcar a reunião" : "Marcar a reunião"}</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <label><span className="label">Dia</span><input type="date" className="input" value={dia} onChange={(e) => setDia(e.target.value)} /></label>
        <label><span className="label">Hora</span><input type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
        <label><span className="label">Duração</span><select className="input" value={dur} onChange={(e) => setDur(+e.target.value)}>{[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
        <label><span className="label">Local ou link</span><input className="input" placeholder="Na área, escritório ou Meet" value={local} onChange={(e) => setLocal(e.target.value)} /></label>
      </div>
      <h4 className="label mt-4">Participantes</h4>
      {ps.map((p, i) => (
        <div key={i} className="mb-2 grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input className="input py-1.5" placeholder="Nome" value={p.nome} onChange={(e) => setP(i, "nome", e.target.value)} />
          <input className="input py-1.5" placeholder="E-mail" value={p.email} onChange={(e) => setP(i, "email", e.target.value)} />
          <input className="input py-1.5" placeholder="Telefone (opcional)" value={p.telefone} onChange={(e) => setP(i, "telefone", e.target.value)} />
          <button className="text-[12.5px] font-semibold text-rose-700 hover:underline disabled:opacity-30" disabled={ps.length === 1} onClick={() => setPs(ps.filter((_, j) => j !== i))}>Remover</button>
        </div>
      ))}
      <button className="btn-ghost py-1.5 text-[13px]" onClick={() => setPs([...ps, { nome: "", email: "", telefone: "" }])}>+ Participante</button>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-gold" disabled={busy || !dia} onClick={confirmar}>Confirmar reunião</button>
        {ativa && <button className="btn-ghost" onClick={() => setEditando(false)}>Cancelar</button>}
        {msg && <span className="text-sm font-semibold text-rose-700">{msg}</span>}
      </div>
      <p className="mt-2 text-[12.5px] text-muted">O convite vai por e-mail para o primeiro participante; os outros aparecem na descrição. O JBL - Avisos recebe o aviso.</p>
    </section>
  );
}
