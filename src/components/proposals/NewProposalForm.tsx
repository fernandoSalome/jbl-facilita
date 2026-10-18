"use client";

import ValidadeField from "./ValidadeField";
import DestinatarioPicker from "./DestinatarioPicker";
import type { Destinatario } from "@/lib/proposals";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StudyEditor, { useStudyState } from "@/components/study/StudyEditor";
import type { StudyInputs } from "@/lib/calc";
import JblPadrao, { type TemplateProps } from "@/components/template/JblPadrao";
import type { FormatoContent, FormatoKey } from "@/lib/formatos";

export type FormatoOpcao = { key: FormatoKey; content: FormatoContent; disponivel: boolean };

/** Números do estudo; recriado quando o formato muda (para trazer os padrões dele) */
function StudyBlock({ initial, onChange }: { initial: StudyInputs; onChange: (i: StudyInputs) => void }) {
  const study = useStudyState(initial);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => cb.current(study.inputs), [study.inputs]);
  return <StudyEditor state={study} />;
}

type T = { id: string; name: string; description: string | null };

const NO_OVERRIDES = {};
const TODAY = new Date().toISOString();

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-navy font-display text-sm text-gold shadow-[0_0_0_3px_#fff,0_0_0_4px_#C1943D]">{n}</span>
        <div>
          <h2 className="h-display text-xl">{title}</h2>
          {hint && <p className="text-[12.5px] text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function NewProposalForm({
  projectId,
  project,
  templates,
  formatos,
  initialInputs,
}: {
  projectId: string;
  project: TemplateProps["project"];
  templates: T[];
  /** Formatos de cada template (templateId → 4 formatos) */
  formatos: Record<string, FormatoOpcao[]>;
  initialInputs: StudyInputs;
}) {
  const router = useRouter();
  const firstFormato = (tid: string) => formatos[tid]?.find((f) => f.disponivel) ?? formatos[tid]?.[0];
  const [formatoKey, setFormatoKey] = useState<FormatoKey>(() => firstFormato(templates[0]?.id ?? "")?.key ?? "loteamento_aberto");
  const comPadroes = (f: FormatoOpcao | undefined, base: StudyInputs) => (f ? { ...base, ...f.content.padroes } : base);
  const [inputs, setInputs] = useState<StudyInputs>(() => comPadroes(firstFormato(templates[0]?.id ?? ""), initialInputs));
  const [studyKey, setStudyKey] = useState(0);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const opcoes = formatos[templateId] ?? [];
  const formato = opcoes.find((f) => f.key === formatoKey);

  function escolherFormato(f: FormatoOpcao) {
    if (!f.disponivel) return;
    setFormatoKey(f.key);
    setInputs((i) => comPadroes(f, i));
    setStudyKey((n) => n + 1);
  }
  const [carta, setCarta] = useState(true);
  const [validade, setValidade] = useState("15");
  const [semValidade, setSemValidade] = useState(false);
  const [corretorNome, setCorretorNome] = useState("");
  const [destinatario, setDestinatario] = useState<Destinatario>({ tipo: "familia" });
  const [corretorTelefone, setCorretorTelefone] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // ---- rascunho salvo sozinho neste navegador: fechou a página sem querer, volta de onde parou ----
  const chave = `jbl:nova-proposta:${projectId}`;
  const carregado = useRef(false);
  const [recuperado, setRecuperado] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(chave) ?? "null");
      if (r && (r.name || r.ownerName || r.ownerPhone || r.mexeu)) {
        if (r.templateId && formatos[r.templateId]) setTemplateId(r.templateId);
        if (r.formatoKey) setFormatoKey(r.formatoKey);
        if (r.inputs) { setInputs(r.inputs); setStudyKey((n) => n + 1); }
        setName(r.name ?? ""); setOwnerName(r.ownerName ?? ""); setOwnerPhone(r.ownerPhone ?? "");
        setCarta(r.carta ?? true); setValidade(r.validade ?? "15"); setSemValidade(!!r.semValidade);
        setCorretorNome(r.corretorNome ?? ""); setCorretorTelefone(r.corretorTelefone ?? "");
        if (r.destinatario) setDestinatario(r.destinatario);
        setRecuperado(r.savedAt ?? "");
      }
    } catch {}
    carregado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rascunho = { templateId, formatoKey, inputs, name, ownerName, ownerPhone, carta, validade, semValidade, corretorNome, corretorTelefone, destinatario };
  const rascunhoJson = JSON.stringify(rascunho);
  const inicial = useRef(rascunhoJson);
  useEffect(() => {
    if (!carregado.current) return;
    const t = setTimeout(() => {
      try {
        const mexeu = rascunhoJson !== inicial.current;
        if (!mexeu && !recuperado) return;
        localStorage.setItem(chave, JSON.stringify({ ...rascunho, mexeu: true, savedAt: new Date().toISOString() }));
        setSalvoEm(new Date());
      } catch {}
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rascunhoJson]);
  function descartarRascunho() {
    try { localStorage.removeItem(chave); } catch {}
    window.location.reload();
  }

  async function create() {
    setErr("");
    if (!name.trim() || !ownerName.trim()) return setErr("Preencha o nome da proposta e o nome do proprietário.");
    setSaving(true);
    const r = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        templateId,
        formato: formatoKey,
        name,
        ownerName,
        ownerPhone,
        inputs,
        options: { cartaIntencao: carta, validadeDias: Number(validade) || 15, semValidade, corretorNome, corretorTelefone, destinatario },
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setSaving(false);
      return setErr(d.error ?? "Erro ao criar a proposta.");
    }
    try { localStorage.removeItem(chave); } catch {}
    router.push(`/app/proposta/${d.id}`);
  }

  return (
    <div className="grid gap-6">
      {recuperado !== null && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-gold-line border-l-[3px] border-l-gold bg-gold-soft px-4 py-3 text-sm text-navy">
          <span>📝 <b>Rascunho recuperado.</b> Continuamos de onde você parou{recuperado ? ` (${new Date(recuperado).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })})` : ""}.</span>
          <button type="button" className="ml-auto font-semibold text-gold-deep underline" onClick={descartarRascunho}>Começar do zero</button>
        </div>
      )}
      <Step n={1} title="Formato do empreendimento" hint="Define as obras, as benfeitorias e os padrões do lote. Tudo pode ser ajustado depois, na proposta.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {opcoes.map((f) => (
            <button
              key={f.key}
              type="button"
              disabled={!f.disponivel}
              onClick={() => escolherFormato(f)}
              title={f.disponivel ? undefined : "Ainda não há dados para este formato"}
              className={`rounded-md border-[1.5px] p-4 text-left transition ${
                !f.disponivel ? "cursor-not-allowed border-dashed border-line bg-alt opacity-60" : formatoKey === f.key ? "border-gold bg-gold-soft" : "border-line bg-white hover:border-gold-line"
              }`}
            >
              <span className="block font-semibold text-navy">{f.content.label}</span>
              <span className="mt-1 block text-[12px] text-muted">
                {f.disponivel
                  ? `Lote de ${f.content.padroes.metragemLote} m² · ${Math.round(f.content.padroes.aproveitamento * 100)}% aproveitável · ${f.content.infra.length + f.content.complementar.length} obras · ${f.content.benfeitorias.length} benfeitorias`
                  : "Ainda não há dados para este formato"}
              </span>
            </button>
          ))}
        </div>
      </Step>

      <Step n={2} title="Dados básicos">
        <div className="grid gap-4 md:grid-cols-3">
          <label><span className="label">Nome da proposta *</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cenário 35% · 20 anos" /></label>
          <label><span className="label">Proprietário / família *</span><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ex.: Família Silva" /></label>
          <label><span className="label">WhatsApp do proprietário</span><input className="input" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="(18) 99999-9999" /></label>
        </div>
      </Step>

      <Step n={3} title="Números do estudo" hint="Os mesmos campos da planilha. Lote e aproveitamento já vêm com o padrão do formato escolhido.">
        <StudyBlock key={studyKey} initial={inputs} onChange={setInputs} />
      </Step>

      <Step n={4} title="Template e opções">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-2">
            <span className="label">Template</span>
            {templates.map((t) => (
              <label key={t.id} className={`flex cursor-pointer gap-3 rounded border-[1.5px] p-3 transition ${templateId === t.id ? "border-gold bg-gold-soft" : "border-line hover:border-gold-line"}`}>
                <input type="radio" name="tpl" checked={templateId === t.id} onChange={() => { setTemplateId(t.id); const f = firstFormato(t.id); if (f) escolherFormato(f); }} className="mt-1 accent-[#A2782F]" />
                <span>
                  <span className="block font-semibold text-navy">{t.name}</span>
                  {t.description && <span className="block text-[12.5px] text-muted">{t.description}</span>}
                </span>
              </label>
            ))}
          </div>
          <div className="grid content-start gap-4">
            <label className="flex cursor-pointer items-start gap-3 rounded border-[1.5px] border-line p-3 hover:border-gold-line">
              <input type="checkbox" checked={carta} onChange={(e) => setCarta(e.target.checked)} className="mt-1 h-4 w-4 accent-[#A2782F]" />
              <span>
                <span className="block font-semibold text-navy">Incluir carta de intenção</span>
                <span className="block text-[12.5px] text-muted">O proprietário preenche no fim da proposta. Desligue quando puder assustar a família.</span>
              </span>
            </label>
            <DestinatarioPicker value={destinatario} onChange={setDestinatario} />
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3">
              <ValidadeField dias={validade} semValidade={semValidade} onDias={setValidade} onSemValidade={setSemValidade} />
              <label><span className="label">Corretor (opcional)</span><input className="input" value={corretorNome} onChange={(e) => setCorretorNome(e.target.value)} /></label>
              <label><span className="label">Telefone do corretor</span><input className="input" value={corretorTelefone} onChange={(e) => setCorretorTelefone(e.target.value)} /></label>
            </div>
          </div>
        </div>
      </Step>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
          <h2 className="h-display text-xl">Prévia do site da proposta</h2>
          <span className="text-[12.5px] text-muted">Atualiza enquanto você digita os números acima. Os textos podem ser ajustados depois de criar.</span>
        </div>
        {formato && <JblPadrao
          mode="preview"
          token="previa"
          formato={formato.content}
          project={project}
          ownerName={ownerName || "Família"}
          inputs={inputs}
          options={{ cartaIntencao: carta, validadeDias: Number(validade) || 15, semValidade, corretorNome, corretorTelefone, destinatario }}
          overrides={NO_OVERRIDES}
          date={TODAY}
        />}
      </section>

      <div className="sticky bottom-0 -mx-8 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-8 py-4 backdrop-blur">
        {err ? (
          <p className="mr-auto text-sm font-semibold text-rose-700">{err}</p>
        ) : (
          salvoEm && <span className="mr-auto text-[12.5px] text-muted">✓ Rascunho salvo automaticamente às {salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        )}
        <button className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button className="btn-gold px-6" onClick={create} disabled={saving}>{saving ? "Criando…" : "Criar proposta →"}</button>
      </div>
    </div>
  );
}
