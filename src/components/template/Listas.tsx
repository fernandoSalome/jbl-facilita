"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { StudyResult } from "@/lib/calc";
import { fmtNum } from "@/lib/format";
import { aplicarDiff, QTD_CALC, qtdTexto, semEmojiHtml, separarEmoji, type Benfeitoria, type ListaDiff, type ObraItem, type Qtd, type QtdCalcKey } from "@/lib/formatos";
import type { Overrides } from "@/lib/proposals";
import { HTML_PREFIX } from "@/lib/sanitize";
import { E, Fixo, useEdit } from "./Editable";

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
  // texto digitado na etiqueta ("Na entrega", "Na conclusão"...): tarja dourada igual à do "A projetar"
  const digitado = `li.${item.id}.tag` in overrides;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const txt = qtdTexto(q, r, fmtNum);

  const conteudo =
    q.kind === "projetar" ? (
      <>
        <span className={`tag ${q.label && !digitado ? "" : "pend"}`}><E k={`li.${item.id}.tag`}>{q.label || "A projetar"}</E></span>
        {q.unit && ` ${q.unit}`}
      </>
    ) : q.kind === "fixa" ? (
      // texto sem número ("Na entrega", "A definir"...): etiqueta dourada como "A projetar"; quantidade digitada fica normal
      /\d/.test(q.text) ? <E k={`li.${item.id}.qtd`}>{q.text}</E> : <span className="tag pend"><E k={`li.${item.id}.qtd`}>{q.text}</E></span>
    ) : (
      // calculada pela área e pelos lotes: o valor não muda à mão, só o visual
      <Fixo k={`li.${item.id}.calc`}>{txt}</Fixo>
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

export function TabelaObras({ secao, base, r, colunas, className = "tbl" }: { secao: "infra" | "complementar"; base: ObraItem[]; r: StudyResult; colunas: 2 | 3; className?: string }) {
  const l = useLista(secao, base);
  return (
    <>
      <div className={className}><table>
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

const EMOJIS: [string, string[]][] = [
  ["Lazer e esporte", ["🏊", "🏀", "⚽", "🎾", "🏐", "🏓", "🏋️", "💪", "🚴", "🚶", "🏃", "🥾", "🧘", "🛝", "🎡", "🪂", "🎣", "🛶", "⛳", "🛹"]],
  ["Natureza", ["🌳", "🌲", "🌴", "🌿", "🌱", "🍃", "🌷", "🌻", "🌄", "🌅", "🏞️", "💧", "⛲", "🦋", "🐕", "🐾"]],
  ["Construção e segurança", ["🏛️", "🚪", "🧱", "🏠", "🏡", "🏘️", "🏢", "🛡️", "📹", "🚨", "🔒", "🚧", "💡", "⚡", "🌐", "📶", "🅿️", "🚗"]],
  ["Convivência", ["🍖", "🍽️", "🎉", "🎈", "⛱️", "🏕️", "⛺", "🪑", "🧒", "👨‍👩‍👧", "🚰", "♻️", "✨", "⭐", "❤️", "✅"]],
];

/** Emoji em uso: o escolhido, senão o que estava no começo do texto (itens antigos) */
function emojiDe(b: Benfeitoria, ov: Overrides): string | null {
  const escolhido = ov[`li.${b.id}.emoji`];
  if (typeof escolhido === "string") return escolhido || null;
  const salvo = ov[`li.${b.id}.texto`];
  if (typeof salvo === "string") {
    const t = salvo.startsWith(HTML_PREFIX) ? salvo.slice(HTML_PREFIX.length).replace(/^(?:<[^>]+>)*/, "") : salvo;
    const e = separarEmoji(t).emoji;
    if (e) return e;
  }
  return b.emoji ?? separarEmoji(b.texto).emoji;
}

function GradeEmojis({ anchor, atual, onPick, onClose }: { anchor: HTMLElement; atual: string | null; onPick: (e: string) => void; onClose: () => void }) {
  const [outro, setOutro] = useState("");
  const r = anchor.getBoundingClientRect();
  const w = 336;
  const top = r.bottom + 6 + 420 < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - 426);
  const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
  return createPortal(
    <div className="fixed inset-0 z-[2100]" onMouseDown={onClose}>
      <div
        className="absolute max-h-[420px] overflow-auto rounded-md border-t-[3px] border-gold bg-white p-3 font-sans text-[13px] text-ink shadow-2xl"
        style={{ top, left, width: w }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-deep">Escolha o emoji</div>
        {EMOJIS.map(([grupo, lista]) => (
          <div key={grupo} className="mb-2">
            <div className="mb-1 text-[11px] font-semibold text-muted">{grupo}</div>
            <div className="grid grid-cols-8 gap-1">
              {lista.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onPick(e)}
                  className={`grid h-9 place-items-center rounded text-[20px] hover:bg-gold-soft ${e === atual ? "bg-gold-soft ring-1 ring-gold" : ""}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
          <input
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && outro.trim() && onPick(separarEmoji(outro).emoji ?? outro.trim().slice(0, 8))}
            placeholder="Outro: cole aqui"
            className="input w-full py-1 text-[13px]"
          />
          <button type="button" className="btn-ghost shrink-0 py-1 text-[12px]" disabled={!outro.trim()} onClick={() => onPick(separarEmoji(outro).emoji ?? outro.trim().slice(0, 8))}>
            Usar
          </button>
        </div>
        <button type="button" className="mt-2 w-full rounded bg-alt py-1.5 text-[12px] font-semibold text-muted hover:text-navy" onClick={() => onPick("")}>
          Sem emoji
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function ListaBenfeitorias({ base }: { base: Benfeitoria[] }) {
  const l = useLista("benfeitorias", base);
  const { overrides, save } = useEdit();
  const [escolher, setEscolher] = useState<{ id: string; el: HTMLElement } | null>(null);
  // benfeitoria recém-adicionada: abre a grade de emojis dela
  const [nova, setNova] = useState<string | null>(null);
  useEffect(() => {
    if (!nova) return;
    const el = document.querySelector<HTMLElement>(`[data-bf="${nova}"]`);
    if (el) {
      setEscolher({ id: nova, el });
      setNova(null);
    }
  }, [nova, l.itens.length]);

  return (
    <div className="pills bf-grid">
      {l.itens.map((b) => {
        const emoji = emojiDe(b, overrides);
        return (
          <span key={b.id} className={l.editable ? "pill-ed" : undefined}>
            {l.editable ? (
              <button
                type="button"
                data-bf={b.id}
                className={`bf-emoji-btn ${emoji ? "" : "vazio"}`}
                title="Escolher o emoji"
                onClick={(e) => setEscolher({ id: b.id, el: e.currentTarget })}
              >
                {emoji ?? "+ emoji"}
              </button>
            ) : (
              emoji && <span className="bf-emoji">{emoji} </span>
            )}
            <E k={`li.${b.id}.texto`} limpar={(t, h) => (h ? semEmojiHtml(t) : separarEmoji(t).texto)}>{separarEmoji(b.texto).texto}</E>
            {l.editable && <button type="button" className="pill-del" title="Remover" onClick={() => l.remover(b.id)}>✕</button>}
          </span>
        );
      })}
      {l.editable && (
        <button
          type="button"
          className="add-pill"
          onClick={() => {
            const id = novoId();
            l.adicionar({ id, texto: "Nova benfeitoria", emoji: "✨" });
            setNova(id);
          }}
        >
          + Benfeitoria
        </button>
      )}
      {escolher && (
        <GradeEmojis
          anchor={escolher.el}
          atual={emojiDe(l.itens.find((i) => i.id === escolher.id) ?? { id: escolher.id, texto: "" }, overrides)}
          onClose={() => setEscolher(null)}
          onPick={(e) => {
            save(`li.${escolher.id}.emoji`, e);
            setEscolher(null);
          }}
        />
      )}
    </div>
  );
}

/** Contatos exclusivos: uma linha por contato, "+" acrescenta outra (vale na proposta e no template) */
export function ListaContatos({ base, padrao }: { base: { id: string }[]; padrao: { nome?: string; telefone?: string } }) {
  const l = useLista("contatos", base);
  const def = (i: number, campo: "nome" | "telefone") => (i === 0 && padrao[campo]) || "a definir";
  const { overrides } = useEdit();
  // para o cliente, "a definir" vira só o campo em branco (na edição continua aparecendo)
  const campo = (k: string, padraoTxt: string) => {
    const v = overrides[k];
    const txt = (typeof v === "string" ? v.replace(/^html:/, "").replace(/<[^>]+>/g, "") : padraoTxt).trim();
    return !l.editable && /^a definir$/i.test(txt) ? <span className="blank blank-vazio" /> : <span className="blank"><E k={k}>{padraoTxt}</E></span>;
  };
  return (
    <>
      {l.itens.map((c, i) => (
        <span key={c.id} className={l.editable ? "ct-row ct-ed" : "ct-row"}>
          {i > 0 && <br />}
          Nome: {campo(`li.${c.id}.nome`, def(i, "nome"))} · Telefone:{" "}
          {campo(`li.${c.id}.tel`, def(i, "telefone"))}
          {l.editable && <button type="button" className="pill-del ct-del" title="Remover contato" onClick={() => l.remover(c.id)}>✕</button>}
        </span>
      ))}
      {l.editable && (
        <button type="button" className="add-pill ct-add" title="Adicionar contato" onClick={() => l.adicionar({ id: novoId() } as unknown as ObraItem)}>
          + Contato
        </button>
      )}
    </>
  );
}
