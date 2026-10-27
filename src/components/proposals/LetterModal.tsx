"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { fmtDateTime } from "@/lib/format";

type Dados = {
  proprietario?: Record<string, string>;
  casamento?: Record<string, string>;
  conjuge?: Record<string, string>;
  imovel?: Record<string, string>;
  local?: string;
  data?: string;
};
type Carta = { protocolo: string; createdAt: string; proposta: string; projeto: string; dados: Dados; anexo: string | null };

const GRUPOS: [keyof Dados, string, [string, string][]][] = [
  ["proprietario", "Proprietário", [["nome", "Nome completo"], ["cpf", "CPF"], ["rg", "RG"], ["nacionalidade", "Nacionalidade"], ["profissao", "Profissão"], ["telefone", "Telefone"], ["email", "E-mail"]]],
  ["casamento", "Informações matrimoniais", [["estadoCivil", "Estado civil"], ["data", "Data do casamento"], ["regime", "Regime de bens"], ["matricula", "Matrícula"], ["rcpn", "RCPN"], ["municipio", "Município / comarca"], ["observacoes", "Observações"]]],
  ["conjuge", "Cônjuge", [["nome", "Nome completo"], ["cpf", "CPF"], ["rg", "RG"], ["nacionalidade", "Nacionalidade"], ["profissao", "Profissão"]]],
  ["imovel", "Imóvel", [["areaHa", "Área total (ha)"], ["zona", "Zona"], ["municipio", "Município"], ["cartorio", "Cartório de Registro de Imóveis"], ["matriculas", "Matrícula(s)"], ["car", "CAR(s)"]]],
];

/** Pop-up com a carta de intenção preenchida pela família. */
export default function LetterModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [c, setC] = useState<Carta | null>(null);
  useEffect(() => {
    setC(null);
    if (id) fetch(`/api/letters/${id}?formato=json`).then((r) => r.json()).then(setC);
  }, [id]);

  return (
    <Modal
      open={!!id}
      onClose={onClose}
      size="xl"
      eyebrow="Carta de intenção · dados recebidos"
      title={c ? c.dados.proprietario?.nome || "Carta de intenção" : "Carregando…"}
      footer={
        c && (
          <>
            {c.anexo && <a className="btn-ghost mr-auto" href={`/api/letters/${id}?anexo=1`} target="_blank" rel="noreferrer">📎 Ver matrícula ({c.anexo})</a>}
            <a className="btn-ghost" href={`/api/letters/${id}`} target="_blank" rel="noreferrer">Imprimir dados</a>
            <a className="btn-gold" href={`/app/minuta/${id}`}>Minuta e assinatura →</a>
          </>
        )
      }
    >
      {!c ? (
        <p className="py-10 text-center text-sm text-muted">Carregando…</p>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900 ring-1 ring-emerald-200">
            <span>✓ Dados recebidos em <b>{fmtDateTime(c.createdAt)}</b></span>
            <span>Protocolo <b className="font-mono">{c.protocolo}</b></span>
            <span>{c.projeto} · {c.proposta}</span>
          </div>
          {GRUPOS.map(([g, titulo, campos]) => {
            const v = (c.dados[g] ?? {}) as Record<string, string>;
            if (!campos.some(([k]) => v[k])) return null;
            return (
              <section key={g}>
                <h3 className="mb-2 border-b border-gold-line pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">{titulo}</h3>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {campos.map(([k, label]) => (
                    <div key={k}>
                      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
                      <dd className="text-[14px] font-semibold text-navy">{v[k] || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
          <p className="text-[12.5px] text-muted">Local e data informados: {[c.dados.local, c.dados.data].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      )}
    </Modal>
  );
}
