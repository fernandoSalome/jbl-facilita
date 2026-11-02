"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { DIAS_SEMANA, diaDe, horaDe, quando, type Horarios } from "@/lib/agenda";

/**
 * Calendário da empresa (parecido com o Calendly): semana com os compromissos, novo compromisso
 * (pessoal ou reunião com convidado), link público para agendar, horários livres e Google Agenda.
 */

type Config = {
  slug: string; titulo: string; descricao: string; local: string; duracaoMin: number; antecedenciaH: number; diasFrente: number;
  horarios: Horarios; googleEmail: string | null; googleConectado: boolean;
};
type Compromisso = {
  id: string; tipo: "pessoal" | "reuniao"; titulo: string; descricao: string | null; local: string | null; inicio: string; fim: string;
  convidadoNome: string | null; convidadoEmail: string | null; convidadoTel: string | null; origem: string; status: string;
  smsId: string | null; smsErro: string | null; emailErro: string | null;
};

const H0 = 7, H1 = 22, ALT = 44; // horas visíveis na grade e altura de cada hora (px)

/** Segunda-feira da semana de `dia` (AAAA-MM-DD) */
function segundaDe(dia: string) {
  const d = quando(dia, "12:00");
  const dow = d.getUTCDay();
  return diaDe(new Date(d.getTime() - ((dow + 6) % 7) * 864e5));
}
const somaDias = (dia: string, n: number) => diaDe(new Date(quando(dia, "12:00").getTime() + n * 864e5));
const rotuloDia = (dia: string) => quando(dia, "12:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
const minutosDoDia = (d: Date) => {
  const [h, m] = horaDe(d).split(":").map(Number);
  return h * 60 + m;
};

export default function Calendario({ config: inicial, link: linkInicial, servicos, googleRetorno }: {
  config: Config; link: string; servicos: { email: boolean; sms: boolean; google: boolean; whatsapp: string | null }; googleRetorno: string | null;
}) {
  const hoje = diaDe(new Date());
  const [semana, setSemana] = useState(segundaDe(hoje));
  const [lista, setLista] = useState<Compromisso[]>([]);
  const [config, setConfig] = useState(inicial);
  const [link, setLink] = useState(linkInicial);
  const [novo, setNovo] = useState<{ dia: string; hora: string } | null>(null);
  const [aberto, setAberto] = useState<Compromisso | null>(null);
  const [ajustes, setAjustes] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => somaDias(semana, i)), [semana]);

  const carregar = useCallback(async () => {
    const de = quando(semana, "00:00").toISOString(), ate = quando(somaDias(semana, 7), "00:00").toISOString();
    const r = await fetch(`/api/calendario?de=${de}&ate=${ate}`);
    if (r.ok) setLista(await r.json());
  }, [semana]);
  useEffect(() => void carregar(), [carregar]);

  const marcados = lista.filter((c) => c.status === "marcado");
  const proximos = marcados.filter((c) => new Date(c.fim) > new Date()).slice(0, 6);

  function copiar() {
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="grid gap-6 p-8 xl:grid-cols-[1fr_320px]">
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <button className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => setSemana(segundaDe(hoje))}>Hoje</button>
          <button className="btn-ghost px-2.5 py-1.5 text-[13px]" onClick={() => setSemana(somaDias(semana, -7))} aria-label="Semana anterior">‹</button>
          <button className="btn-ghost px-2.5 py-1.5 text-[13px]" onClick={() => setSemana(somaDias(semana, 7))} aria-label="Próxima semana">›</button>
          <span className="ml-1 font-display text-[18px] text-navy">
            {quando(semana, "12:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" })}
          </span>
          <button className="btn-gold ml-auto px-3.5 py-2 text-[13px]" onClick={() => setNovo({ dia: hoje < semana ? semana : hoje, hora: "09:00" })}>+ Novo compromisso</button>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,1fr)]">
            <div />
            {dias.map((d, i) => (
              <div key={d} className={`border-b border-l border-line px-2 py-2 text-center text-[12px] ${d === hoje ? "bg-gold-soft font-bold text-navy" : "text-muted"}`}>
                {DIAS_SEMANA[(i + 1) % 7].slice(0, 3)} <b className="text-navy">{rotuloDia(d)}</b>
              </div>
            ))}
            <div className="relative" style={{ height: (H1 - H0) * ALT }}>
              {Array.from({ length: H1 - H0 }, (_, h) => (
                <div key={h} className="absolute right-1.5 -translate-y-1/2 text-[10.5px] text-muted" style={{ top: h * ALT }}>{h ? `${String(H0 + h).padStart(2, "0")}:00` : ""}</div>
              ))}
            </div>
            {dias.map((d) => {
              const faixas = config.horarios[String(quando(d, "12:00").getUTCDay())] ?? [];
              return (
                <div key={d} className="relative border-l border-line" style={{ height: (H1 - H0) * ALT }}>
                  {/* horários livres para o link (fundo claro) */}
                  {faixas.map(([de, ate]) => {
                    const a = Math.max(minutosDoDia(quando(d, de)) - H0 * 60, 0), b = Math.min(minutosDoDia(quando(d, ate)) - H0 * 60, (H1 - H0) * 60);
                    return b > a ? <div key={de} className="absolute inset-x-0 bg-[#F7F2E7]/70" style={{ top: (a / 60) * ALT, height: ((b - a) / 60) * ALT }} /> : null;
                  })}
                  {Array.from({ length: H1 - H0 }, (_, h) => (
                    <button
                      key={h}
                      className="absolute inset-x-0 border-t border-line/70 hover:bg-gold/10"
                      style={{ top: h * ALT, height: ALT }}
                      onClick={() => setNovo({ dia: d, hora: `${String(H0 + h).padStart(2, "0")}:00` })}
                      aria-label={`Novo compromisso em ${rotuloDia(d)} às ${H0 + h}h`}
                    />
                  ))}
                  {marcados
                    .filter((c) => diaDe(new Date(c.inicio)) === d)
                    .map((c) => {
                      const ini = minutosDoDia(new Date(c.inicio)) - H0 * 60;
                      const dur = (new Date(c.fim).getTime() - new Date(c.inicio).getTime()) / 60e3;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setAberto(c)}
                          className={`absolute inset-x-1 overflow-hidden rounded px-1.5 py-0.5 text-left text-[11.5px] leading-tight shadow-sm ${c.tipo === "pessoal" ? "border border-navy/30 bg-[#E3E9F0] text-navy" : "bg-navy text-white"}`}
                          style={{ top: (Math.max(ini, 0) / 60) * ALT, height: Math.max((dur / 60) * ALT - 2, 18) }}
                          title={c.titulo}
                        >
                          <b className="block truncate">{c.titulo}</b>
                          <span className="opacity-75">{horaDe(new Date(c.inicio))}–{horaDe(new Date(c.fim))}</span>
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2 text-[12px] text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-navy" /> reunião com convidado</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-navy/30 bg-[#E3E9F0]" /> compromisso pessoal</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm bg-[#F7F2E7]" /> horários livres no seu link</span>
        </div>
      </section>

      <aside className="grid content-start gap-5">
        <section className="card p-5">
          <div className="eyebrow mb-2">Seu link para agendar</div>
          <p className="mb-3 text-[13px] text-muted">Mande para a pessoa: ela escolhe um horário livre e recebe a confirmação por e-mail.</p>
          <div className="truncate rounded border border-line bg-alt px-3 py-2 text-[13px] text-navy">{link}</div>
          <div className="mt-2 flex gap-2">
            <button className="btn-gold flex-1 px-3 py-2 text-[13px]" onClick={copiar}>{copiado ? "✓ Link copiado" : "Copiar link"}</button>
            <a className="btn-ghost px-3 py-2 text-[13px]" href={link} target="_blank" rel="noreferrer">Abrir ↗</a>
          </div>
          <button className="mt-3 text-[13px] font-semibold text-gold-deep underline" onClick={() => setAjustes(true)}>Horários livres, duração e link</button>
        </section>

        <section className="card p-5">
          <div className="eyebrow mb-2">Google Agenda</div>
          {googleRetorno === "erro" && <p className="mb-2 rounded bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">Não foi possível conectar. Tente de novo.</p>}
          {config.googleConectado ? (
            <>
              <p className="text-[13px] text-navy"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Conectado{config.googleEmail ? ` · ${config.googleEmail}` : ""}</p>
              <p className="mt-1 text-[12.5px] text-muted">Os horários ocupados no Google somem do seu link de agendamento.</p>
              <button
                className="mt-3 text-[13px] font-semibold text-rose-700 underline"
                onClick={async () => {
                  if (!confirm("Desconectar o Google Agenda?")) return;
                  await fetch("/api/calendario/google/desconectar", { method: "POST" });
                  setConfig({ ...config, googleConectado: false, googleEmail: null });
                }}
              >
                Desconectar
              </button>
            </>
          ) : servicos.google ? (
            <>
              <p className="mb-3 text-[13px] text-muted">Conecte para que os horários em que você já tem compromisso no Google fiquem indisponíveis no link.</p>
              <a className="btn-navy inline-block px-3 py-2 text-[13px]" href="/api/calendario/google/conectar">Conectar Google Agenda</a>
            </>
          ) : (
            <p className="text-[12.5px] text-amber-800">Falta configurar o Google na Vercel (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).</p>
          )}
        </section>

        <section className="card p-5">
          <div className="eyebrow mb-3">Próximos nesta semana</div>
          {proximos.length === 0 ? (
            <p className="text-[13px] text-muted">Nada marcado.</p>
          ) : (
            <ul className="grid gap-2">
              {proximos.map((c) => (
                <li key={c.id}>
                  <button className="w-full rounded px-2 py-1.5 text-left hover:bg-alt" onClick={() => setAberto(c)}>
                    <div className="truncate text-[13px] font-semibold text-navy">{c.titulo}</div>
                    <div className="text-[12px] text-muted">{rotuloDia(diaDe(new Date(c.inicio)))} · {horaDe(new Date(c.inicio))}{c.convidadoNome ? ` · ${c.convidadoNome}` : ""}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`rounded border p-4 text-[12.5px] ${servicos.whatsapp ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          {servicos.whatsapp
            ? <p>WhatsApp: cada reunião marcada ou cancelada é avisada no grupo <b>{servicos.whatsapp}</b>, com lembrete 1 dia e 1 hora antes.</p>
            : <p>WhatsApp: cadastre o grupo de monitoramento (com &quot;monitoring&quot; no nome) em Assistente WhatsApp para receber os avisos das reuniões.</p>}
        </section>

        {(!servicos.email || !servicos.sms) && (
          <section className="rounded border border-amber-200 bg-amber-50 p-4 text-[12.5px] text-amber-900">
            {!servicos.email && <p>E-mail ao convidado: falta configurar o Resend (RESEND_API_KEY e EMAIL_FROM).</p>}
            {!servicos.sms && <p className={servicos.email ? "" : "mt-1"}>SMS de lembrete: falta configurar o Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_MESSAGING_SERVICE_SID).</p>}
          </section>
        )}
      </aside>

      {novo && <NovoCompromisso inicial={novo} duracao={config.duracaoMin} local={config.local} onClose={() => setNovo(null)} onCriado={() => { setNovo(null); carregar(); }} />}
      {aberto && <Detalhe c={aberto} onClose={() => setAberto(null)} onCancelado={() => { setAberto(null); carregar(); }} />}
      {ajustes && (
        <Ajustes
          config={config}
          onClose={() => setAjustes(false)}
          onSalvo={(c, l) => { setConfig(c); setLink(l); setAjustes(false); }}
          base={link.slice(0, link.lastIndexOf("/") + 1)}
        />
      )}
    </div>
  );
}

/* ---------------- novo compromisso ---------------- */

function NovoCompromisso({ inicial, duracao, local: localPadrao, onClose, onCriado }: { inicial: { dia: string; hora: string }; duracao: number; local: string; onClose: () => void; onCriado: () => void }) {
  const fimPadrao = horaDe(new Date(quando(inicial.dia, inicial.hora).getTime() + duracao * 60e3));
  const [f, setF] = useState({ tipo: "reuniao" as "pessoal" | "reuniao", titulo: "", dia: inicial.dia, de: inicial.hora, ate: fimPadrao, local: localPadrao, descricao: "", convidadoNome: "", convidadoEmail: "", convidadoTel: "" });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function salvar(ignorarConflito = false) {
    setSalvando(true);
    setErro("");
    const r = await fetch("/api/calendario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, inicio: quando(f.dia, f.de).toISOString(), fim: quando(f.dia, f.ate).toISOString(), ignorarConflito }),
    });
    const j = await r.json().catch(() => ({}));
    setSalvando(false);
    if (r.status === 409 && j.conflito) {
      if (confirm(`${j.error}. Marcar mesmo assim?`)) return salvar(true);
      return;
    }
    if (!r.ok) return setErro(j.error ?? "Não foi possível salvar");
    const avisos = [j.emailErro && `E-mail: ${j.emailErro}`, j.smsErro && `SMS: ${j.smsErro}`].filter(Boolean);
    if (avisos.length) alert(`Compromisso salvo, mas:\n${avisos.join("\n")}`);
    onCriado();
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Calendário"
      title="Novo compromisso"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-gold" disabled={salvando} onClick={() => salvar()}>{salvando ? "Salvando…" : f.tipo === "reuniao" ? "Marcar e avisar o convidado" : "Salvar"}</button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="flex overflow-hidden rounded border border-line text-[13px] font-semibold">
          {(["reuniao", "pessoal"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setF({ ...f, tipo: t })} className={`flex-1 px-3 py-2 ${f.tipo === t ? "bg-navy text-white" : "bg-white text-navy hover:bg-alt"}`}>
              {t === "reuniao" ? "Reunião com outra pessoa" : "Compromisso só meu"}
            </button>
          ))}
        </div>
        <label><span className="label">Título</span><input className="input" value={f.titulo} onChange={on("titulo")} placeholder={f.tipo === "reuniao" ? "Ex.: Reunião sobre a gleba São Judas" : "Ex.: Visita à prefeitura"} autoFocus /></label>
        <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <label><span className="label">Dia</span><input type="date" className="input" value={f.dia} onChange={on("dia")} /></label>
          <label><span className="label">Das</span><input type="time" className="input" value={f.de} onChange={on("de")} /></label>
          <label><span className="label">Até</span><input type="time" className="input" value={f.ate} onChange={on("ate")} /></label>
        </div>
        <label><span className="label">Local ou link da chamada</span><input className="input" value={f.local} onChange={on("local")} placeholder="Ex.: escritório da JBL, ou link do Meet" /></label>
        {f.tipo === "reuniao" && (
          <fieldset className="grid gap-2 rounded border border-line p-3">
            <legend className="px-1 text-[12px] font-bold uppercase tracking-wider text-muted">Convidado</legend>
            <label><span className="label">Nome</span><input className="input" value={f.convidadoNome} onChange={on("convidadoNome")} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label><span className="label">E-mail (recebe o convite)</span><input type="email" className="input" value={f.convidadoEmail} onChange={on("convidadoEmail")} /></label>
              <label><span className="label">Celular (SMS 1 hora antes)</span><input type="tel" className="input" value={f.convidadoTel} onChange={on("convidadoTel")} placeholder="(11) 99999-9999" /></label>
            </div>
          </fieldset>
        )}
        <label><span className="label">Observações</span><textarea className="input min-h-[70px]" value={f.descricao} onChange={on("descricao")} /></label>
        {erro && <p className="rounded bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{erro}</p>}
      </div>
    </Modal>
  );
}

/* ---------------- detalhe ---------------- */

function Detalhe({ c, onClose, onCancelado }: { c: Compromisso; onClose: () => void; onCancelado: () => void }) {
  const ini = new Date(c.inicio);
  const linhas: [string, string | null][] = [
    ["Quando", `${ini.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" })} · ${horaDe(ini)}–${horaDe(new Date(c.fim))}`],
    ["Local", c.local],
    ["Convidado", [c.convidadoNome, c.convidadoEmail, c.convidadoTel].filter(Boolean).join(" · ") || null],
    ["Agendado", c.origem === "link" ? "pelo convidado, no seu link" : null],
    ["Observações", c.descricao],
    ["E-mail", c.tipo === "reuniao" && c.convidadoEmail ? (c.emailErro ? `⚠ ${c.emailErro}` : "✓ convite enviado") : null],
    ["SMS", c.tipo === "reuniao" && c.convidadoTel ? (c.smsErro ? `⚠ ${c.smsErro}` : c.smsId ? "✓ lembrete agendado para 1 hora antes" : "será agendado mais perto da data") : null],
  ];
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={c.tipo === "reuniao" ? "Reunião" : "Compromisso pessoal"}
      title={c.titulo}
      footer={
        <>
          {new Date(c.fim) > new Date() && (
            <button
              className="btn-danger"
              onClick={async () => {
                if (!confirm(c.tipo === "reuniao" && c.convidadoEmail ? "Cancelar? O convidado recebe um e-mail avisando e o SMS é cancelado." : "Cancelar este compromisso?")) return;
                const r = await fetch(`/api/calendario/${c.id}`, { method: "DELETE" });
                if (r.ok) onCancelado();
                else alert("Não foi possível cancelar.");
              }}
            >
              Cancelar compromisso
            </button>
          )}
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </>
      }
    >
      <dl className="grid gap-2 text-[14px]">
        {linhas.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-muted">{k}</dt>
            <dd className="text-navy">{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

/* ---------------- ajustes ---------------- */

function Ajustes({ config, base, onClose, onSalvo }: { config: Config; base: string; onClose: () => void; onSalvo: (c: Config, link: string) => void }) {
  const [f, setF] = useState(config);
  const [erro, setErro] = useState("");
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  const faixa = (d: number) => f.horarios[String(d)] ?? [];
  const setFaixa = (d: number, v: [string, string][]) => setF({ ...f, horarios: { ...f.horarios, [String(d)]: v } });

  async function salvar() {
    setErro("");
    const r = await fetch("/api/calendario/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setErro(j.error ?? "Não foi possível salvar");
    onSalvo({ ...f, slug: j.slug }, base + j.slug);
  }

  return (
    <Modal open onClose={onClose} eyebrow="Calendário" title="Horários livres, duração e link" size="xl" footer={<><button className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" onClick={salvar}>Salvar</button></>}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-3">
          <label>
            <span className="label">Link</span>
            <div className="flex items-stretch">
              <span className="grid place-items-center rounded-l border border-r-0 border-line bg-alt px-2 text-[12px] text-muted">{base.replace(/^https?:\/\//, "")}</span>
              <input className="input rounded-l-none" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} />
            </div>
          </label>
          <label><span className="label">Nome da reunião (aparece no link)</span><input className="input" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></label>
          <label><span className="label">Descrição</span><textarea className="input min-h-[64px]" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></label>
          <label><span className="label">Local ou link da chamada</span><input className="input" value={f.local} onChange={(e) => setF({ ...f, local: e.target.value })} /></label>
          <div className="grid grid-cols-3 gap-2">
            <label><span className="label">Duração (min)</span><input className="input" inputMode="numeric" value={f.duracaoMin} onChange={(e) => setF({ ...f, duracaoMin: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
            <label><span className="label">Antecedência (h)</span><input className="input" inputMode="numeric" value={f.antecedenciaH} onChange={(e) => setF({ ...f, antecedenciaH: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
            <label><span className="label">Dias à frente</span><input className="input" inputMode="numeric" value={f.diasFrente} onChange={(e) => setF({ ...f, diasFrente: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
          </div>
        </div>
        <div>
          <span className="label">Horários livres</span>
          <div className="grid gap-1.5">
            {ordem.map((d) => (
              <div key={d} className="grid grid-cols-[96px_1fr] items-start gap-2 border-b border-line/70 pb-1.5">
                <label className="flex items-center gap-2 pt-1.5 text-[13px] font-semibold text-navy">
                  <input type="checkbox" className="h-4 w-4 accent-[#A2782F]" checked={faixa(d).length > 0} onChange={(e) => setFaixa(d, e.target.checked ? [["09:00", "18:00"]] : [])} />
                  {DIAS_SEMANA[d].slice(0, 3)}
                </label>
                <div className="grid gap-1">
                  {faixa(d).length === 0 && <span className="pt-1.5 text-[13px] text-muted">Indisponível</span>}
                  {faixa(d).map(([de, ate], i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input type="time" className="input w-auto py-1 text-[13px]" value={de} onChange={(e) => setFaixa(d, faixa(d).map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                      <span className="text-muted">–</span>
                      <input type="time" className="input w-auto py-1 text-[13px]" value={ate} onChange={(e) => setFaixa(d, faixa(d).map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                      <button className="px-1.5 text-muted hover:text-rose-700" title="Tirar este horário" onClick={() => setFaixa(d, faixa(d).filter((_, j) => j !== i))}>✕</button>
                      {i === faixa(d).length - 1 && <button className="px-1.5 font-bold text-gold-deep" title="Mais um horário neste dia" onClick={() => setFaixa(d, [...faixa(d), ["14:00", "18:00"]])}>+</button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {erro && <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{erro}</p>}
    </Modal>
  );
}
