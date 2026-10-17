"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { StudyResult } from "@/lib/calc";
import { fmtNum } from "@/lib/format";
import { aplicarDiff, QTD_CALC, qtdTexto, type Benfeitoria, type ListaDiff, type ObraItem, type Qtd, type QtdCalcKey } from "@/lib/formatos";
import { E, useEdit } from "./Editable";

/**
 * Listas de obras e benfeitorias do formato. Na proposta, adicionar ou remover
 * grava só a diferença (lista.<seção>): o resto continua vindo do template.
 */

const novoId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function useLista<T extends { id: string }>(secao: string, base: T[]) {
  const { overrides, editable, save } = useEdit();
  const key = `lista.${secao}`;
  const diff = (overrides[key] ?? {}) as ListaDiff;
  const itens = aplicarDiff(base, diff);
  function gravar(d: ListaDiff) {
    const vazio = !(d.added?.length || d.removed?.length);
    save(key, vazio ? null : d);
  }
  return {
    itens,
    editable,
    remover(id: string) {
      const added = (diff.added ?? []).filter((i) => i.id !== id);
      const isAdded = added.length !== (diff.added ?? []).length;
      gravar({ added, removed: isAdded ? diff.removed : [...(diff.removed ?? []), id] });
    },
    adicionar(item: ObraItem | Benfeitoria) {
      gravar({ ...diff, added: [...(diff.added ?? []), item] });
    },
  };
}

function QtdCell({ item, r }: { item: ObraItem; r: StudyResult }) {
  const { overrides, editable, save } = useEdit();
  const q = (overrides[`liq.${item.id}`] as Qtd | undefined) ?? item.qtd;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const txt = qtdTexto(q, r, fmtNum);

  const conteudo =
    q.kind === "projetar" ? (
      <>
        <span className={`tag ${q.label ? "" : "pend"}`}><E k={`li.${item.id}.tag`}>{q.label || "A projetar"}</E></span>
        {q.unit && ` ${q.unit}`}
      </>
    ) : q.kind === "fixa" ? (
      <E k={`li.${item.id}.qtd`}>{q.text}</E>
    ) : (
      txt
    );

  if (!editable) return <>{conteudo}</>;

  const set = (v: Qtd) => save(`liq.${item.id}`, v);
  return (
    <span className="qtd-ed">
      {conteudo}
      <button
        type="button"
        className="qtd-btn"
        title="Tipo de quantidade"
        onClick={(e) => {
          const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPos(pos ? null : { top: b.bottom + 6, left: Math.min(b.left - 200, window.innerWidth - 300) });
        }}
      >
        ⚙
      </button>
      {pos &&
        createPortal(
          <div className="fixed inset-0 z-[2100]" onMouseDown={() => setPos(null)}>
            <div
              className="absolute w-[280px] rounded-md border-t-[3px] border-gold bg-white p-3 font-sans text-[13px] text-ink shadow-2xl"
              style={{ top: pos.top, left: Math.max(8, pos.left) }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-deep">Quantidade</div>
              <label className="flex items-center gap-2 py-1">
                <input type="radio" checked={q.kind === "calc"} onChange={() => set({ kind: "calc", key: "rede" })} className="accent-[#A2782F]" />
                Calculada pela área e pelos lotes
              </label>
              {q.kind === "calc" && (
                <select className="input mb-1 ml-6 w-[calc(100%-24px)] py-1 text-[12.5px]" value={q.key} onChange={(e) => set({ kind: "calc", key: e.target.value as QtdCalcKey })}>
                  {(Object.keys(QTD_CALC) as QtdCalcKey[]).map((k) => (
                    <option key={k} value={k}>{QTD_CALC[k].label} ({QTD_CALC[k].unit})</option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 py-1">
                <input type="radio" checked={q.kind === "fixa"} onChange={() => set({ kind: "fixa", text: txt ?? "1 un." })} className="accent-[#A2782F]" />
                Fixa (digito o valor)
              </label>
              {q.kind === "fixa" && <p className="ml-6 text-[11.5px] text-muted">Clique no valor na tabela para mudar o texto.</p>}
              <label className="flex items-center gap-2 py-1">
                <input type="radio" checked={q.kind === "projetar"} onChange={() => set({ kind: "projetar" })} className="accent-[#A2782F]" />
                Etiqueta “A projetar”
              </label>
              {q.kind === "projetar" && (
                <label className="ml-6 flex items-center gap-2 text-[12px] text-muted">
                  Unidade ao lado
                  <select className="input w-24 py-1 text-[12.5px]" value={q.unit ?? ""} onChange={(e) => set({ ...q, unit: e.target.value || undefined })}>
                    <option value="">nenhuma</option>
                    <option>m²</option>
                    <option>ml</option>
                    <option>un.</option>
                  </select>
                </label>
              )}
              <button type="button" className="btn-ghost mt-2 w-full py-1 text-[12px]" onClick={() => { save(`liq.${item.id}`, null); setPos(null); }}>
                ↺ Voltar ao do template
              </button>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}

export function TabelaObras({ secao, base, r, colunas }: { secao: "infra" | "complementar"; base: ObraItem[]; r: StudyResult; colunas: 2 | 3 }) {
  const l = useLista(secao, base);
  return (
    <>
      <div className="tbl"><table>
        <thead>
          {colunas === 3 ? (
            <tr><th><E k="txt.s2th1">Obra</E></th><th><E k="txt.s2th2">O que é, em palavras simples</E></th><th className="r"><E k="txt.s2th3">Quantidade média</E></th></tr>
          ) : (
            <tr><th><E k="txt.s2th4">Item</E></th><th className="r"><E k="txt.s2th5">Previsão</E></th></tr>
          )}
        </thead>
        <tbody>
          {l.itens.map((it) => (
            <tr key={it.id} className={l.editable ? "row-ed" : undefined}>
              <td data-label={colunas === 3 ? "Obra" : "Item"}><E k={`li.${it.id}.obra`}>{it.obra}</E></td>
              {colunas === 3 && <td data-label="O que é, em palavras simples"><E k={`li.${it.id}.desc`}>{it.desc || "—"}</E></td>}
              <td data-label={colunas === 3 ? "Quantidade média" : "Previsão"} className="r">
                <QtdCell item={it} r={r} />
                {l.editable && <button type="button" className="row-del" title="Remover linha" onClick={() => l.remover(it.id)}>✕</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {l.editable && (
        <button
          type="button"
          className="add-btn"
          onClick={() => l.adicionar({ id: novoId(), obra: "Nova obra", desc: "O que é, em palavras simples", qtd: { kind: "projetar" } })}
        >
          + Adicionar linha
        </button>
      )}
    </>
  );
}

export function ListaBenfeitorias({ base }: { base: Benfeitoria[] }) {
  const l = useLista("benfeitorias", base);
  return (
    <div className="pills">
      {l.itens.map((b) => (
        <span key={b.id} className={l.editable ? "pill-ed" : undefined}>
          <E k={`li.${b.id}.texto`}>{b.texto}</E>
          {l.editable && <button type="button" className="pill-del" title="Remover" onClick={() => l.remover(b.id)}>✕</button>}
        </span>
      ))}
      {l.editable && (
        <button type="button" className="add-pill" onClick={() => l.adicionar({ id: novoId(), texto: "✨ Nova benfeitoria" })}>
          + Benfeitoria
        </button>
      )}
    </div>
  );
}
