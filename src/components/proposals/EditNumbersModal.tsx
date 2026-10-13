"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import StudyEditor, { useStudyState } from "@/components/study/StudyEditor";
import type { StudyInputs } from "@/lib/calc";
import type { ProposalOptions } from "@/lib/proposals";

type P = { id: string; name: string; ownerName: string; ownerPhone: string | null; inputs: StudyInputs; options: ProposalOptions; overridesCount: number };

export type Draft = { inputs: StudyInputs; options: ProposalOptions; ownerName: string };

/**
 * Dados básicos + planilha da proposta. `onDraft` recebe cada alteração enquanto a
 * pessoa digita, para a proposta logo abaixo se atualizar antes de salvar.
 */
export function ProposalNumbersForm({
  proposal,
  onDraft,
  onDone,
  compact,
}: {
  proposal: P;
  onDraft?: (d: Draft) => void;
  onDone: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const study = useStudyState(proposal.inputs);
  const [name, setName] = useState(proposal.name);
  const [ownerName, setOwnerName] = useState(proposal.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(proposal.ownerPhone ?? "");
  const [carta, setCarta] = useState(proposal.options.cartaIntencao);
  const [validade, setValidade] = useState(String(proposal.options.validadeDias));
  const [saving, setSaving] = useState(false);
  const options: ProposalOptions = { ...proposal.options, cartaIntencao: carta, validadeDias: Number(validade) || 15 };

  useEffect(() => {
    onDraft?.({ inputs: study.inputs, options, ownerName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.inputs, carta, validade, ownerName]);

  async function save() {
    setSaving(true);
    await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ownerName, ownerPhone, inputs: study.inputs, options }),
    });
    setSaving(false);
    onDone();
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
        <label><span className="label">Nome da proposta</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label><span className="label">Proprietário</span><input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} /></label>
        <label><span className="label">WhatsApp</span><input className="input" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} /></label>
        <label><span className="label">Validade (dias)</span><input className="input w-24 text-right" value={validade} onChange={(e) => setValidade(e.target.value)} /></label>
        <label className="flex items-end gap-2 pb-2.5 text-sm font-semibold text-navy">
          <input type="checkbox" checked={carta} onChange={(e) => setCarta(e.target.checked)} className="h-4 w-4 accent-[#A2782F]" />
          Carta de intenção
        </label>
      </div>
      <StudyEditor state={study} compact={compact} />
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-white/95 px-1 py-3 backdrop-blur">
        {proposal.overridesCount > 0 && (
          <span className="mr-auto text-[12.5px] text-muted">✎ {proposal.overridesCount} valor(es) alterado(s) à mão na proposta continuam como estão.</span>
        )}
        <button className="btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn-gold" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar e atualizar proposta"}</button>
      </div>
    </div>
  );
}

/** Pop-up usado na lista de propostas. */
export default function EditNumbersModal({ proposal, onClose }: { proposal: P; onClose: () => void }) {
  return (
    <Modal open size="xl" onClose={onClose} eyebrow="Editar proposta" title={proposal.name}>
      <ProposalNumbersForm proposal={proposal} onDone={onClose} />
    </Modal>
  );
}
