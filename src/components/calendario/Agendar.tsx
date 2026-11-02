"use client";

import { useEffect, useMemo, useState } from "react";
import { dataExtenso, diaDe, horaDe, quando } from "@/lib/agenda";

/** Página pública de agendamento: mês → dia → horário livre → nome, e-mail e celular → confirmado */

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Agendar(p: {
  slug: string; nome: string; titulo: string; descricao: string | null; local: string | null; duracaoMin: number;
  diasComHorario: number[]; primeiro: string; ultimo: string;
}) {
  const [mes, setMes] = useState(p.primeiro.slice(0, 7)); // AAAA-MM
  const [dia, setDia] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [f, setF] = useState({ nome: "", email: "", telefone: "", observacao: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<{ inicio: string } | null>(null);

  const celulas = useMemo(() => {
    const [a, m] = mes.split("-").map(Number);
    const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const vazio = new Date(Date.UTC(a, m - 1, 1)).getUTCDay();
    return [...Array(vazio).fill(null), ...Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)] as (string | null)[];
  }, [mes]);

  useEffect(() => {
    if (!dia) return;
    setHorarios(null);
    setEscolhido(null);
    fetch(`/api/public/agenda/${p.slug}?dia=${dia}`).then((r) => r.json()).then((j) => setHorarios(j.horarios ?? [])).catch(() => setHorarios([]));
  }, [dia, p.slug]);

  const podeDia = (d: string) => d >= p.primeiro && d <= p.ultimo && p.diasComHorario.includes(quando(d, "12:00").getUTCDay());
  const trocaMes = (n: number) => {
    const [a, m] = mes.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    setMes(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  async function confirmar() {
    if (!escolhido) return;
    setEnviando(true);
    setErro("");
    const r = await fetch(`/api/public/agenda/${p.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, inicio: escolhido }) });
    const j = await r.json().catch(() => ({}));
    setEnviando(false);
    if (!r.ok) {
      setErro(j.error ?? "Não foi possível agendar");
      if (r.status === 409 && dia) {
        setEscolhido(null);
        fetch(`/api/public/agenda/${p.slug}?dia=${dia}`).then((x) => x.json()).then((x) => setHorarios(x.horarios ?? []));
      }
      return;
    }
    setFeito({ inicio: j.inicio });
  }

  return (
    <main className="min-h-screen bg-alt px-4 py-10">
      <div className="card mx-auto grid max-w-4xl overflow-hidden md:grid-cols-[280px_1fr]">
        <div className="border-b border-line p-6 md:border-b-0 md:border-r">
          <img src="/brand/lockup.webp" alt="JBL Incorporadora" className="mb-6 h-9 w-auto" />
          <div className="text-[13px] font-semibold text-muted">{p.nome}</div>
          <h1 className="h-display mt-1 text-[24px] leading-tight">{p.titulo}</h1>
          <ul className="mt-4 grid gap-1.5 text-[14px] text-navy">
            <li>🕑 {p.duracaoMin} minutos</li>
            {p.local && <li>📍 {p.local}</li>}
            {escolhido && <li className="font-semibold">📅 {dataExtenso(new Date(escolhido))}</li>}
          </ul>
          {p.descricao && <p className="mt-4 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">{p.descricao}</p>}
        </div>

        <div className="p-6">
          {feito ? (
            <div className="grid place-items-center py-10 text-center">
              <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
              <h2 className="h-display text-[22px]">Reunião marcada</h2>
              <p className="mt-2 text-[14px] text-navy">{dataExtenso(new Date(feito.inicio))}</p>
              <p className="mt-2 max-w-sm text-[13.5px] text-muted">Enviamos o convite para {f.email}. Uma hora antes você recebe um SMS de lembrete.</p>
            </div>
          ) : escolhido ? (
            <div className="grid gap-3">
              <button className="justify-self-start text-[13px] font-semibold text-gold-deep" onClick={() => setEscolhido(null)}>‹ Escolher outro horário</button>
              <h2 className="text-[17px] font-bold text-navy">Seus dados</h2>
              <label><span className="label">Nome completo</span><input className="input" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus /></label>
              <label><span className="label">E-mail</span><input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              <label><span className="label">Celular com DDD (lembrete por SMS)</span><input type="tel" className="input" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="(11) 99999-9999" /></label>
              <label><span className="label">Algo que devemos saber antes? (se quiser)</span><textarea className="input min-h-[70px]" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></label>
              {erro && <p className="rounded bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{erro}</p>}
              <button className="btn-gold mt-1" disabled={enviando} onClick={confirmar}>{enviando ? "Agendando…" : "Confirmar reunião"}</button>
            </div>
          ) : (
            <div className={`grid gap-6 ${dia ? "lg:grid-cols-[1fr_180px]" : ""}`}>
              <div>
                <h2 className="mb-3 text-[17px] font-bold text-navy">Escolha o dia</h2>
                <div className="mb-2 flex items-center justify-between">
                  <button className="btn-ghost px-2.5 py-1" onClick={() => trocaMes(-1)} disabled={mes <= p.primeiro.slice(0, 7)} aria-label="Mês anterior">‹</button>
                  <b className="text-navy">{MESES[Number(mes.slice(5)) - 1]} {mes.slice(0, 4)}</b>
                  <button className="btn-ghost px-2.5 py-1" onClick={() => trocaMes(1)} disabled={mes >= p.ultimo.slice(0, 7)} aria-label="Próximo mês">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[12px]">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <div key={i} className="py-1 font-bold text-muted">{d}</div>)}
                  {celulas.map((d, i) =>
                    d ? (
                      <button
                        key={d}
                        disabled={!podeDia(d)}
                        onClick={() => setDia(d)}
                        className={`aspect-square rounded-full text-[14px] font-semibold transition ${d === dia ? "bg-navy text-white" : podeDia(d) ? "bg-gold-soft text-navy hover:bg-gold/40" : "text-muted/40"}`}
                      >
                        {Number(d.slice(8))}
                      </button>
                    ) : (
                      <div key={`v${i}`} />
                    ),
                  )}
                </div>
                <p className="mt-3 text-[12px] text-muted">Horário de Brasília</p>
              </div>
              {dia && (
                <div>
                  <h3 className="mb-3 text-[14px] font-bold capitalize text-navy">{quando(dia, "12:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "short" })}</h3>
                  {horarios === null ? (
                    <p className="text-[13px] text-muted">Carregando…</p>
                  ) : horarios.length === 0 ? (
                    <p className="text-[13px] text-muted">Sem horários livres neste dia.</p>
                  ) : (
                    <div className="grid max-h-[340px] gap-2 overflow-auto pr-1">
                      {horarios.map((h) => (
                        <button key={h} onClick={() => setEscolhido(h)} className="rounded border border-gold px-3 py-2 text-[14px] font-semibold text-navy hover:bg-gold-soft">
                          {horaDe(new Date(h))}
                        </button>
                      ))}
                    </div>
                  )}
                  {erro && <p className="mt-2 text-[12.5px] text-rose-700">{erro}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-muted">JBL Incorporadora · {diaDe(new Date()).slice(0, 4)}</p>
    </main>
  );
}
