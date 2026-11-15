"use client";

import { afetadas } from "@/lib/personalizadas";

type Proposta = { id: string; name: string; formato: string; projeto: string; bloqueada?: boolean; personalizadas?: string[] };

/**
 * Na janela de salvar o template: textos que o template mudou e que alguma proposta tinha personalizado.
 * Marcando, a proposta troca o texto dela pelo do template (e volta a seguir o template). Nada vem marcado.
 */
export default function TrocarPersonalizadas({
  propostas,
  mudadasPorFormato,
  marcadas,
  trocas,
  onChange,
  previa,
  nomeTipo,
}: {
  propostas: Proposta[];
  mudadasPorFormato: Record<string, string[]>;
  /** propostas que vão para a versão nova: só nelas dá para trocar */
  marcadas: Set<string>;
  trocas: Record<string, string[]>;
  onChange: (t: Record<string, string[]>) => void;
  /** texto novo do template naquela chave, para mostrar */
  previa: (formato: string, k: string) => string;
  nomeTipo: (formato: string) => string;
}) {
  const lista = afetadas(propostas, mudadasPorFormato);
  if (!lista.length) return null;
  const porId = new Map(propostas.map((p) => [p.id, p]));
  // agrupado por texto: o texto novo e, embaixo, as propostas que tinham personalizado
  const chaves = [...new Set(lista.flatMap((a) => a.chaves))];
  const marcado = (id: string, k: string) => !!trocas[id]?.includes(k);
  const alternar = (id: string, k: string, on: boolean) => {
    const atual = trocas[id] ?? [];
    const n = { ...trocas, [id]: on ? [...atual, k] : atual.filter((x) => x !== k) };
    if (!n[id].length) delete n[id];
    onChange(n);
  };

  return (
    <div className="rounded border border-[#e0a800]">
      <div className="border-b border-line bg-[#fffaf0] px-3 py-2 text-[13px]">
        <b className="text-navy">Textos personalizados nas propostas</b>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Estas propostas tinham mudado o texto por conta própria, e ele vale mais que o do template. Marque onde o texto da proposta deve ser trocado pelo novo do template. Desmarcadas, ficam com o texto delas.
        </p>
      </div>
      <div className="max-h-[32vh] overflow-y-auto">
        {chaves.map((k) => {
          const comEla = lista.filter((a) => a.chaves.includes(k));
          const p0 = porId.get(comEla[0].id)!;
          return (
            <div key={k} className="border-b border-line/70 px-3 py-2 last:border-0">
              <div className="mb-1 text-[12.5px] text-ink">
                <span className="font-semibold text-gold-deep">Novo no template:</span> {previa(p0.formato, k)}
              </div>
              {comEla.map((a) => {
                const p = porId.get(a.id)!;
                const pode = marcadas.has(a.id);
                return (
                  <label key={a.id} className={`flex items-start gap-2.5 py-1 text-[13px] ${pode ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`} title={pode ? undefined : "Marque a proposta na lista acima para poder trocar"}>
                    <input type="checkbox" className="mt-0.5 accent-[#A2782F]" disabled={!pode} checked={pode && marcado(a.id, k)} onChange={(e) => alternar(a.id, k, e.target.checked)} />
                    <span>
                      Trocar pelo do template em <span className="font-semibold text-navy">{p.name}</span> <span className="text-muted">· {p.projeto} · {nomeTipo(p.formato)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
