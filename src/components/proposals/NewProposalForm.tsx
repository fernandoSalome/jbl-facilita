"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StudyEditor, { useStudyState } from "@/components/study/StudyEditor";
import type { StudyInputs } from "@/lib/calc";
import JblPadrao, { type TemplateProps } from "@/components/template/JblPadrao";

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

export default function NewProposalForm({ projectId, project, templates, initialInputs }: { projectId: string; project: TemplateProps["project"]; templates: T[]; initialInputs: StudyInputs }) {
  const router = useRouter();
  const study = useStudyState(initialInputs);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [carta, setCarta] = useState(true);
  const [validade, setValidade] = useState("15");
  const [corretorNome, setCorretorNome] = useState("");
  const [corretorTelefone, setCorretorTelefone] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

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
        name,
        ownerName,
        ownerPhone,
        inputs: study.inputs,
        options: { cartaIntencao: carta, validadeDias: Number(validade) || 15, corretorNome, corretorTelefone },
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setSaving(false);
      return setErr(d.error ?? "Erro ao criar a proposta.");
    }
    router.push(`/app/projetos/${projectId}/propostas/${d.id}`);
  }

  return (
    <div className="grid gap-6">
      <Step n={1} title="Dados básicos">
        <div className="grid gap-4 md:grid-cols-3">
          <label><span className="label">Nome da proposta *</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Cenário 35% · 20 anos" /></label>
          <label><span className="label">Proprietário / família *</span><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ex.: Família Silva" /></label>
          <label><span className="label">WhatsApp do proprietário</span><input className="input" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="(18) 99999-9999" /></label>
        </div>
      </Step>

      <Step n={2} title="Números do estudo" hint="Os mesmos campos da planilha. Já vêm com os valores padrão da JBL.">
        <StudyEditor state={study} />
      </Step>

      <Step n={3} title="Template e opções">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-2">
            <span className="label">Template</span>
            {templates.map((t) => (
              <label key={t.id} className={`flex cursor-pointer gap-3 rounded border-[1.5px] p-3 transition ${templateId === t.id ? "border-gold bg-gold-soft" : "border-line hover:border-gold-line"}`}>
                <input type="radio" name="tpl" checked={templateId === t.id} onChange={() => setTemplateId(t.id)} className="mt-1 accent-[#A2782F]" />
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
            <div className="grid grid-cols-[120px_1fr_1fr] gap-3">
              <label><span className="label">Validade (dias)</span><input className="input text-right" value={validade} onChange={(e) => setValidade(e.target.value)} /></label>
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
        <JblPadrao
          mode="preview"
          token="previa"
          project={project}
          ownerName={ownerName || "Família"}
          inputs={study.inputs}
          options={{ cartaIntencao: carta, validadeDias: Number(validade) || 15, corretorNome, corretorTelefone }}
          overrides={NO_OVERRIDES}
          date={TODAY}
        />
      </section>

      <div className="sticky bottom-0 -mx-8 flex items-center justify-end gap-3 border-t border-line bg-white/95 px-8 py-4 backdrop-blur">
        {err && <p className="mr-auto text-sm font-semibold text-rose-700">{err}</p>}
        <button className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button className="btn-gold px-6" onClick={create} disabled={saving}>{saving ? "Criando…" : "Criar proposta →"}</button>
      </div>
    </div>
  );
}
