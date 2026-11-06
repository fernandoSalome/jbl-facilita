"use client";

import { useEffect, useRef, useState } from "react";
import Apresentacao from "./Apresentacao";
import PlanilhaNaPagina from "./PlanilhaNaPagina";
import { ESTILO_PADRAO, FONTES, type Conteudo, type Estilo, type Formato } from "@/lib/apresentacao/tipos";

/**
 * Edição da apresentação: clicar num texto edita e seleciona (a barra muda fonte, tamanho, negrito e cores dele);
 * "Página" muda as cores, as fontes e a logo. Tudo salva sozinho no rascunho; o link mostra a versão do "Gerar link".
 */
export default function EditorApresentacao({ slug, inicial, link, publicadoEm }: { slug: string; inicial: Conteudo; link: string; publicadoEm: string | null }) {
  const [c, setC] = useState<Conteudo>(inicial);
  const [sel, setSel] = useState<string | null>(null);
  const [status, setStatus] = useState<"salvo" | "salvando" | "erro">("salvo");
  const [aviso, setAviso] = useState<string | null>(null);
  const [publicado, setPublicado] = useState<string | null>(publicadoEm);
  const [linkAberto, setLinkAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [painel, setPainel] = useState(false);
  const [planilhaAberta, setPlanilhaAberta] = useState(false);
  const logo = useRef<HTMLInputElement>(null);

  // salva o rascunho um pouco depois da última mudança (só quando algo mudou de verdade)
  const salvo = useRef(JSON.stringify([inicial.dados, inicial.textos, inicial.formatos, inicial.estilo]));
  useEffect(() => {
    const agora = JSON.stringify([c.dados, c.textos, c.formatos, c.estilo]);
    if (agora === salvo.current) return;
    setStatus("salvando");
    const t = setTimeout(async () => {
      const r = await fetch(`/api/apresentacao/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados: c.dados, textos: c.textos, formatos: c.formatos, estilo: c.estilo }),
      }).catch(() => null);
      if (r?.ok) {
        salvo.current = agora;
        setStatus("salvo");
      }
      else {
        setStatus("erro");
        const e = await r?.json().catch(() => null);
        if (e?.error) setAviso(e.error);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [slug, c.dados, c.textos, c.formatos, c.estilo]);

  const setTexto = (k: string, v: string) => setC((x) => ({ ...x, textos: { ...x.textos, [k]: v } }));
  const fmt = sel ? c.formatos[sel] ?? {} : {};
  const setFmt = (p: Partial<Formato>) => {
    if (!sel) return;
    setC((x) => {
      const n = { ...(x.formatos[sel] ?? {}), ...p };
      for (const k of Object.keys(n) as (keyof Formato)[]) if (n[k] === undefined || n[k] === "") delete n[k];
      return { ...x, formatos: { ...x.formatos, [sel]: n } };
    });
  };
  const limparFmt = () => sel && setC((x) => { const f = { ...x.formatos }; delete f[sel]; return { ...x, formatos: f }; });
  const voltarTexto = () => sel && setC((x) => { const t = { ...x.textos }; delete t[sel]; return { ...x, textos: t }; });
  const setEstilo = (p: Partial<Estilo>) => setC((x) => ({ ...x, estilo: { ...x.estilo, ...p } }));

  // tamanho atual do texto selecionado (o da tela, quando ainda não foi mudado)
  const tamanhoAtual = () => {
    if (fmt.tamanho) return fmt.tamanho;
    const el = document.activeElement as HTMLElement | null;
    return el?.classList.contains("ap-ed") ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 16;
  };

  async function gerarLink() {
    setAviso(null);
    const r = await fetch(`/api/apresentacao/${slug}/publicar`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setAviso(j.error ?? "Não foi possível gerar o link.");
    setPublicado(j.publicadoEm);
    setLinkAberto(true);
  }

  function trocarLogo(f: File) {
    if (f.size > 1_500_000) return setAviso("A logo é grande demais. Use uma imagem de até 1,5 MB.");
    const rd = new FileReader();
    rd.onload = () => setEstilo({ logo: String(rd.result) });
    rd.readAsDataURL(f);
  }

  const btn = "rounded border border-white/25 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/10 disabled:opacity-40";
  const campo = "rounded border border-white/25 bg-white/10 px-2 py-1 text-[13px] text-white outline-none [&>option]:text-ink";
  // a barra não tira o foco do texto que está sendo editado
  const manterFoco = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (!["INPUT", "SELECT", "OPTION"].includes(t.tagName)) e.preventDefault();
  };

  return (
    <div>
      <div className="sticky top-0 z-50 bg-[#122A45] text-white shadow-lg" onMouseDown={manterFoco}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <div className="mr-auto min-w-0">
            <div className="text-[13px] font-bold">Apresentação · {c.textos.titulo ?? "Chácaras Primavera"}</div>
            <div className="text-[11.5px] text-white/60">
              {status === "salvando" ? "Salvando…" : status === "erro" ? "Erro ao salvar" : "Salvo"}
              {" · "}
              {publicado ? `link atualizado em ${new Date(publicado).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}` : "link ainda não gerado"}
            </div>
          </div>
          <button className={btn} onClick={() => setPainel((v) => !v)} aria-expanded={painel}>Página e logo</button>
          <button className="rounded bg-white px-3 py-1.5 text-[13px] font-bold text-[#122A45] hover:bg-white/90" onClick={() => setPlanilhaAberta(true)}>Abrir planilha</button>
          <button className="rounded bg-[#C1943D] px-4 py-1.5 text-[13px] font-bold text-[#122A45] hover:brightness-105" onClick={gerarLink}>Gerar link</button>
        </div>

        {/* texto selecionado */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2 text-[12.5px]">
            <span className="font-semibold text-white/70">{sel ? "Texto selecionado:" : "Clique num texto da página para editar e mudar a aparência."}</span>
            {sel && (
              <>
                <select className={campo} value={fmt.fonte ?? ""} onChange={(e) => setFmt({ fonte: e.target.value || undefined })}>
                  <option value="">Fonte da página</option>
                  {FONTES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <span className="flex items-center gap-1">
                  <button className={btn} onClick={() => setFmt({ tamanho: Math.max(9, tamanhoAtual() - 1) })} title="Diminuir a letra">A−</button>
                  <span className="w-10 text-center tabular-nums">{fmt.tamanho ? `${fmt.tamanho}px` : "auto"}</span>
                  <button className={btn} onClick={() => setFmt({ tamanho: Math.min(96, tamanhoAtual() + 1) })} title="Aumentar a letra">A+</button>
                </span>
                <button className={`${btn} ${fmt.negrito ? "bg-white/20" : ""}`} onClick={() => setFmt({ negrito: !fmt.negrito })} title="Negrito"><b>N</b></button>
                <label className="flex items-center gap-1">Cor <input type="color" value={fmt.cor ?? "#122A45"} onChange={(e) => setFmt({ cor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent" /></label>
                <label className="flex items-center gap-1">Fundo <input type="color" value={fmt.fundo ?? "#ffffff"} onChange={(e) => setFmt({ fundo: e.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent" /></label>
                {fmt.fundo && <button className={btn} onClick={() => setFmt({ fundo: undefined })}>Sem fundo</button>}
                <button className={btn} onClick={limparFmt}>Aparência original</button>
                <button className={btn} onClick={voltarTexto}>Texto original</button>
              </>
            )}
          </div>
        </div>

        {painel && (
          <div className="border-t border-white/10 bg-[#1B3757]">
            <div className="mx-auto grid max-w-[1400px] gap-3 px-4 py-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1">Fonte dos textos
                <select className={campo} value={c.estilo.fonte} onChange={(e) => setEstilo({ fonte: e.target.value })}>{FONTES.map((f) => <option key={f}>{f}</option>)}</select>
              </label>
              <label className="grid gap-1">Fonte dos títulos
                <select className={campo} value={c.estilo.fonteTitulos} onChange={(e) => setEstilo({ fonteTitulos: e.target.value })}>{FONTES.map((f) => <option key={f}>{f}</option>)}</select>
              </label>
              {([["corPrincipal", "Cor principal (títulos e faixas)"], ["corDestaque", "Cor de destaque (detalhes)"], ["corFundo", "Cor de fundo da página"], ["corTexto", "Cor dos textos"]] as const).map(([k, rot]) => (
                <label key={k} className="flex items-center justify-between gap-2">{rot}
                  <input type="color" value={c.estilo[k]} onChange={(e) => setEstilo({ [k]: e.target.value })} className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent" />
                </label>
              ))}
              <div className="grid gap-1">Logo
                <div className="flex flex-wrap gap-2">
                  <button className={btn} onClick={() => logo.current?.click()}>Trocar logo</button>
                  {c.estilo.logo && <button className={btn} onClick={() => setEstilo({ logo: null })}>Logo da JBL</button>}
                </div>
                <input ref={logo} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) trocarLogo(f); e.target.value = ""; }} />
              </div>
              <label className="grid gap-1">Tamanho da logo ({c.estilo.logoAltura}px)
                <input type="range" min={24} max={140} value={c.estilo.logoAltura} onChange={(e) => setEstilo({ logoAltura: Number(e.target.value) })} />
              </label>
              <div className="flex items-end">
                <button className={btn} onClick={() => setEstilo({ ...ESTILO_PADRAO, logo: c.estilo.logo, logoAltura: c.estilo.logoAltura })}>Cores e fontes originais</button>
              </div>
            </div>
          </div>
        )}

        {(aviso || linkAberto) && (
          <div className="border-t border-white/10 bg-[#F7F2E7] text-[#122A45]">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
              {linkAberto && (
                <>
                  <span className="font-bold">Link para o proprietário:</span>
                  <input readOnly value={link} className="min-w-0 flex-1 rounded border border-[#ECE1C4] bg-white px-2 py-1" onFocus={(e) => e.currentTarget.select()} />
                  <button className="rounded bg-[#122A45] px-3 py-1 font-semibold text-white" onClick={() => { navigator.clipboard.writeText(link); setCopiado(true); setTimeout(() => setCopiado(false), 1800); }}>{copiado ? "✓ Copiado" : "Copiar link"}</button>
                  <a className="rounded border border-[#122A45] px-3 py-1 font-semibold" href={link} target="_blank" rel="noreferrer">Abrir</a>
                </>
              )}
              {aviso && <span className={linkAberto ? "basis-full" : ""}>{aviso}</span>}
              <button className="ml-auto text-[12px] underline" onClick={() => { setAviso(null); setLinkAberto(false); }}>Fechar</button>
            </div>
          </div>
        )}
      </div>

      <Apresentacao c={c} ed={{ selecionado: sel, selecionar: setSel, setTexto }} />
      {planilhaAberta && (
        <PlanilhaNaPagina
          dados={c.dados}
          nomes={(k, padrao) => c.textos[k] ?? padrao}
          onChange={(dados) => setC((x) => ({ ...x, dados }))}
          onFechar={() => setPlanilhaAberta(false)}
        />
      )}
    </div>
  );
}
