"use client";

import { useEffect, useRef, useState } from "react";
import type { DadosCustos } from "@/lib/apresentacao/planilha";
import { opcoesDaRegiao } from "@/lib/apresentacao/modelo";
import { ajustada, ajustar, mudarGrupo, mudarItemGestao, mudarItemObra } from "@/lib/apresentacao/contas";

const brl = (n: number | null) => (n === null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const texto = (n: number | null) => (n === null ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 4 }));
const ler = (t: string): number | null | undefined => {
  const s = t.trim().replace(/[R$\s]/g, "");
  if (!s) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/** " meses", " lotes"... depois da quantidade de um item por mês ou por lote */
const vezes = (u: string | null) => (u === "mês" ? " meses" : u === "lote" ? " lotes" : u === "un." ? " unid." : "");

const azul ="rounded border border-[#9DC3E6] bg-[#DDEBF7] px-2 py-1 font-semibold text-[#122A45] outline-none focus:border-[#C1943D] focus:bg-white";
// número trocado na página (não é o da planilha): contorno dourado
const trocado = "!border-[#C1943D] !bg-[#FBF3E4]";

/**
 * Campo de número como numa planilha: digita com vírgula e a conta muda a cada tecla.
 * Vazio = volta ao número da planilha (quando há fórmulas).
 */
function Numero({ valor, onChange, largura = "w-28", marcado = false }: { valor: number | null; onChange: (n: number | null) => void; largura?: string; marcado?: boolean }) {
  const [t, setT] = useState(texto(valor));
  const focado = useRef(false);
  // enquanto digita, o texto é o da pessoa (ex.: "1," no meio de "1,5"); fora do campo, segue a conta
  useEffect(() => {
    if (!focado.current) setT(texto(valor));
  }, [valor]);
  return (
    <input
      inputMode="decimal"
      value={t}
      onChange={(e) => {
        setT(e.target.value);
        const n = ler(e.target.value);
        if (n !== undefined && n !== valor) onChange(n);
      }}
      onFocus={(e) => {
        focado.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focado.current = false;
        setT(texto(valor));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      className={`${largura} ${azul} text-right text-[13.5px] ${marcado ? trocado : ""}`}
    />
  );
}

/**
 * A aba "CUSTOS" aberta na página: o Marcelo troca quantidades e valores aqui mesmo, sem o Excel.
 * Com as fórmulas da planilha guardadas, cada número trocado refaz tudo o que depende dele (como no Excel).
 */
export default function PlanilhaNaPagina({ dados, nomes, onChange, onFechar }: { dados: DadosCustos; nomes: (k: string, padrao: string) => string; onChange: (d: DadosCustos) => void; onFechar: () => void }) {
  const d = dados;
  const formulas = !!d.modelo && !!d.abas;
  const c = d.abas?.custos ?? "CUSTOS", dd = d.abas?.dados ?? "DADOS DO PARCELAMENTO";
  const cel = (celula: string, v: string | number | null) => onChange(ajustar(d, celula, v));
  const marca = (celula: string) => formulas && ajustada(d, celula);
  const info = (p: Partial<DadosCustos["info"]>) => onChange({ ...d, info: { ...d.info, ...p } });
  const regioes = formulas ? opcoesDaRegiao(d.modelo!) : [];
  const th = "px-2 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider text-[#697683]";
  const thItem = "px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#697683]";
  const campoInfo = (rotulo: string, chave: "area" | "lotes" | "lote" | "meses", celula: string) => (
    <label className="grid gap-1 font-semibold text-[#122A45]">{rotulo}
      <Numero largura="w-full" valor={d.info[chave]} marcado={marca(celula)} onChange={(v) => (formulas ? cel(celula, v) : info({ [chave]: v }))} />
    </label>
  );
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#F8F9FB]">
      <div className="flex flex-wrap items-center gap-3 bg-[#122A45] px-4 py-3 text-white">
        <div className="mr-auto">
          <div className="text-[15px] font-bold">Planilha de custos</div>
          <div className="text-[12px] text-white/65">
            {formulas
              ? "Troque qualquer número: as contas da planilha se refazem na hora. Apagar um número volta ao da planilha. O proprietário vê depois de “Gerar link”."
              : "Troque os números aqui. A página muda na hora; o proprietário vê depois de “Gerar link”."}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#C1943D]">Custo total</div>
          <div className="text-[20px] font-bold">{brl(d.total)}</div>
        </div>
        <button className="rounded bg-[#C1943D] px-4 py-2 text-[13px] font-bold text-[#122A45]" onClick={onFechar}>Fechar planilha</button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto grid max-w-[1100px] gap-6 p-4 pb-16">
          <section className="rounded-md border border-[#DDE3E9] bg-white p-4">
            <h2 className="mb-3 text-[15px] font-bold text-[#122A45]">Dados do empreendimento</h2>
            <div className="grid gap-3 text-[13px] sm:grid-cols-3">
              <label className="grid gap-1 font-semibold text-[#122A45]">Tipo
                <input className={`${azul} ${marca(`${dd}!C4`) ? trocado : ""}`} value={d.info.tipo ?? ""} onChange={(e) => (formulas ? cel(`${dd}!C4`, e.target.value || null) : info({ tipo: e.target.value || null }))} />
              </label>
              {campoInfo("Área total (m²)", "area", `${dd}!C5`)}
              {campoInfo("Lotes", "lotes", `${dd}!C22`)}
              {campoInfo("Tamanho do lote (m²)", "lote", `${dd}!C6`)}
              <label className="grid gap-1 font-semibold text-[#122A45]">Região de preços
                {regioes.length ? (
                  <select className={`${azul} ${marca(`${c}!C6`) ? trocado : ""}`} value={d.info.regiao ?? ""} onChange={(e) => cel(`${c}!C6`, e.target.value)}>
                    {regioes.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <input className={azul} value={d.info.regiao ?? ""} onChange={(e) => info({ regiao: e.target.value || null })} />
                )}
              </label>
              {campoInfo("Prazo das obras (meses)", "meses", `${c}!C3`)}
            </div>
            {formulas && <p className="mt-3 text-[12px] text-[#697683]">Os lotes saem da área e do tamanho do lote, como na planilha. Digitar um número de lotes fixa esse número; apagar volta à conta.</p>}
          </section>

          <section className="grid gap-4">
            <h2 className="text-[17px] font-bold text-[#122A45]">Obras e infraestrutura</h2>
            {d.obras.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-md border border-[#DDE3E9] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE3E9] bg-[#EEF2F6] px-3 py-2">
                  <span className="font-bold text-[#122A45]">{nomes(`${g.id}.nome`, g.nome)}</span>
                  <span className="flex items-center gap-4 text-[13px]">
                    <label className="flex items-center gap-1.5 font-semibold text-[#122A45]">
                      <input
                        type="checkbox"
                        className="accent-[#C1943D]"
                        checked={g.implanta !== false}
                        onChange={(e) => onChange(formulas && g.linhaImplanta ? ajustar(d, `${c}!C${g.linhaImplanta}`, e.target.checked ? "Sim" : "Não") : mudarGrupo(d, "obras", g.id, { implanta: e.target.checked }))}
                      />
                      Incluir no custo
                    </label>
                    <b className="text-[15px] text-[#122A45]">{g.implanta === false ? "fora do custo" : brl(g.total)}</b>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-[13px]">
                    <thead><tr><th className={thItem}>Item</th><th className={th}>Quantidade</th><th className={th}>Valor unitário</th><th className={th}>Total</th></tr></thead>
                    <tbody>
                      {g.itens.filter((i) => i.total !== null || i.quantidade !== null || i.unitario !== null).map((i) => {
                        const auto = i.quantidade !== null && i.unitario !== null;
                        const mudar = (col: "G" | "H" | "I", campo: "unitario" | "quantidade" | "total", v: number | null) =>
                          onChange(formulas && i.linha ? ajustar(d, `${c}!${col}${i.linha}`, v) : mudarItemObra(d, g.id, i.id, { [campo]: v }));
                        return (
                          <tr key={i.id} className="border-t border-[#EEF2F6]">
                            <td className="px-3 py-1.5 text-[#2B3A4A]">{nomes(`${i.id}.nome`, i.nome)}{i.opcao && <small className="ml-1.5 font-bold text-[#A2782F]">{i.opcao}</small>}</td>
                            <td className="px-2 py-1 text-right"><Numero valor={i.quantidade} marcado={marca(`${c}!H${i.linha}`)} onChange={(v) => mudar("H", "quantidade", v)} />{nomes(`${i.id}.unidade`, i.unidade ?? "") && <span className="ml-1 text-[11px] text-[#697683]">{nomes(`${i.id}.unidade`, i.unidade ?? "")}</span>}</td>
                            <td className="px-2 py-1 text-right"><Numero valor={i.unitario} marcado={marca(`${c}!G${i.linha}`)} onChange={(v) => mudar("G", "unitario", v)} /></td>
                            <td className="px-2 py-1 text-right font-bold text-[#122A45]">
                              {auto ? brl(i.total) : <Numero valor={i.total} marcado={marca(`${c}!I${i.linha}`)} onChange={(v) => mudar("I", "total", v)} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-4">
            <h2 className="text-[17px] font-bold text-[#122A45]">Projetos, documentação e gestão</h2>
            <p className="-mt-2 text-[12.5px] text-[#697683]">
              {formulas
                ? "Os totais seguem as fórmulas da planilha (alguns itens são por lote ou por mês). Digitar um total fixa esse número; apagar volta à conta."
                : "Aqui o total de cada grupo é digitado (alguns itens são por lote ou por mês, como na planilha)."}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {d.gestao.map((g) => (
                <div key={g.id} className="overflow-hidden rounded-md border border-[#DDE3E9] bg-white">
                  <div className="flex items-center justify-between gap-2 border-b border-[#DDE3E9] bg-[#EEF2F6] px-3 py-2">
                    <span className="font-bold text-[#122A45]">{nomes(`${g.id}.nome`, g.nome)}</span>
                    <Numero valor={g.total} marcado={marca(`${c}!C${g.linha}`)} onChange={(v) => onChange(formulas && g.linha ? ajustar(d, `${c}!C${g.linha}`, v) : mudarGrupo(d, "gestao", g.id, { total: v }))} />
                  </div>
                  <table className="w-full text-[13px]">
                    <tbody>
                      {g.itens.filter((i) => i.total !== null).map((i) => (
                        <tr key={i.id} className="border-t border-[#EEF2F6] first:border-t-0">
                          <td className="px-3 py-1.5 text-[#2B3A4A]">{nomes(`${i.id}.nome`, i.nome)}</td>
                          <td className="px-2 py-1 text-right"><Numero valor={i.unitario ?? i.total} marcado={marca(`${c}!C${i.linha}`)} onChange={(v) => onChange(formulas && i.linha ? ajustar(d, `${c}!C${i.linha}`, v) : mudarItemGestao(d, g.id, i.id, v))} /></td>
                          {/* por mês / por lote: o valor digitado × prazo ou lotes, que é o que entra no grupo */}
                          <td className="whitespace-nowrap px-2 py-1 text-right text-[12px] text-[#697683]">
                            {i.quantidade !== null && <>× {texto(i.quantidade)}{vezes(i.unidade)} = <b className="text-[#122A45]">{brl(i.total)}</b></>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
