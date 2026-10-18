"use client";

import "./jbl-padrao.css";
import "./jbl-padrao-extra.css";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { calcular, type StudyInputs } from "@/lib/calc";
import { extensoReais, fmtBRL, fmtBRL0, fmtLongDate, fmtNum, fmtPct } from "@/lib/format";
import type { Overrides, ProposalOptions } from "@/lib/proposals";
import type { FormatoContent } from "@/lib/formatos";
import { tratamento } from "@/lib/destinatario";
import { E, EditProvider, Img, Lnk, Sec, ThemeRoot } from "./Editable";
import IntentForm from "./IntentForm";
import { ListaBenfeitorias, ListaContatos, TabelaObras } from "./Listas";
import Tracker from "./Tracker";

/**
 * Template "Proposta JBL padrão": mesma estrutura, classes e textos do site da
 * proposta (modelos/jbl-padrao/index.html), com os números vindos do estudo, as
 * listas do formato e os textos ajustados ao destinatário (família, proprietário
 * ou pessoa). Todo texto passa por <T>/<V> e pode ser editado.
 */

export type TemplateProps = {
  project: { name: string; tipo: string; municipio: string; uf: string; matricula: string | null; aerialImage: string | null };
  ownerName: string;
  inputs: StudyInputs;
  options: ProposalOptions;
  overrides: Overrides;
  /** Conteúdo do formato (listas, lei, textos do template) */
  formato: FormatoContent;
  date: string;
  token: string;
  mode: "public" | "edit" | "preview";
  onSave?: (k: string, v: unknown) => Promise<void>;
  /** Páginas do último PDF gerado desta proposta (null = ainda não gerado) */
  pdfPages?: number | null;
  /** Endereço do PDF pronto (página pública); sem ele o botão abre a impressão */
  pdfUrl?: string;
  /** Renderização para o PDF: sem rastreio de leitura */
  printing?: boolean;
};

/** Texto do template. Chave "txt.<k>". */
function T({ k, children, multiline, html, fixo }: { k: string; children: string; multiline?: boolean; html?: boolean; fixo?: boolean }) {
  return <E k={`txt.${k}`} multiline={multiline} html={html} fixo={fixo ?? FIXOS.has(k)}>{children}</E>;
}
/** Valor calculado pela planilha. Chave "v.<k>". Não é editável na proposta. */
function V({ k, children }: { k: string; children: string }) {
  return <E k={`v.${k}`} fixo>{children}</E>;
}

/** Textos montados com números da planilha: ficam travados para não congelar um valor errado */
const FIXOS = new Set([
  "capaChip2", "fotoLegenda", "statUtilD", "statLoteD", "s1d1", "s1k2", "s1d2", "s1d3", "s1Lote", "s3Extenso2",
  "v2t", "v5t", "v5n1", "v5n2", "v5n3", "v5p2", "v5k1", "v5d4", "v5tip", "e1k2", "vs2k2", "s8n1", "s9p3", "s9l1", "s9l2", "vdTip2",
]);

const Chevron = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Phone = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1z" fill="currentColor" /></svg>
);

const EMPRESAS: [string, string][] = [
  ["JBL Incorporadora", "Unidade responsável pela aquisição de áreas rurais e urbanas, concepção, desenvolvimento e gestão de novos negócios em todo o território nacional."],
  ["JBL Loteadora e Urbanização", "Unidades de negócios exclusivas em desenvolvimento e urbanização de loteamentos residenciais, ecológicos, industriais, condomínios horizontais e chacreamentos com bairros planejados, do econômico ao alto padrão."],
  ["JBL Empreendimentos", "Braço do grupo que realiza toda a criação e expansão de novos negócios e empreendimentos, com o conceito da realização, inovação, dinamismo e o DNA do seu corpo diretivo."],
  ["JBL Vendas", "Empresa formada por equipes de corretores próprios, parceiros ou terceirizados, especializados em comercializar todos os produtos da JBL Incorporadora e Urbanismo disponíveis ao mercado."],
  ["JBL Reflorestamento", "Empresa especializada em reflorestamento de áreas degradadas com plantios diversos de 20 a 50 árvores por cada uma retirada, bem como sua manutenção e conservação continuada por até 12 anos."],
  ["JBL Financiamento", "Empresa que disponibiliza aos seus adquirentes financiamento próprio com a JBL Incorporadora e Urbanismo, sem burocracia."],
  ["JBL Securitizadora", "Unidade que disponibiliza aos parceiros terrenistas, corretores intermediadores diretos e prestadores de serviços constantes na SPE e SCP a compra de carteira (antecipação de recebíveis), por meio da empresa, quando disponível, ou da gama de parceiros com os quais mantém tratativas no mercado."],
];

const ETAPAS6: [string, string][] = [
  ["Estudar a área", "Verificar documentos, restrições, desenho, demanda e viabilidade econômica."],
  ["Formalizar a parceria", "Definir a participação, a estrutura da SPE, responsabilidades, governança e condições sobre o imóvel."],
  ["Conduzir as aprovações", "Preparar projetos e atender as exigências dos órgãos responsáveis antes dos marcos seguintes."],
  ["Comercializar os lotes", "Antes do início das obras, comercializar os lotes, organizando marketing, corretores, contratos e pagamentos dos compradores, conforme os marcos aplicáveis."],
  ["Iniciar as obras de infraestrutura", "Iniciar as obras após as vendas, com acompanhamento por relatórios, fotos e vídeos quinzenais, conforme previsto."],
  ["Administrar e repassar", "Gerir a carteira, prestar contas e realizar os repasses acordados com os proprietários."],
];

const PREMISSAS: [string, string][] = [
  ["I. Governança", "Estruturas e processos relacionados à transparência, ética e conformidade regulatória, visando à mais alta integridade perante as leis municipais, estaduais e federais."],
  ["II. Inclusão e prevenção", "Responsabilidade social e segurança."],
  ["III. Sustentabilidade", "Práticas relacionadas ao meio ambiente, como redução de emissões, conservação de recursos e gestão de resíduos."],
  ["IV. Segurança trabalhista", "Provisionamento de recolhimento de todos os tributos e encargos sociais, trabalhistas e previdenciários de todos os colaboradores envolvidos neste projeto."],
  ["V. Independência financeira", "Operacionalização com recursos próprios da JBL e/ou por meio de parcerias e demais mecanismos de estruturação e alavancagem financeira, sem dependência de empréstimos ou financiamentos bancários para execução dos projetos."],
];

const SOCIAIS: [string, string, React.ReactNode][] = [
  ["https://jblincorporadora.com.br/", "Site", <svg key="s" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z" /></svg>],
  ["https://www.instagram.com/jbl_incorporadora/", "Instagram", <svg key="i" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" /></svg>],
  ["https://www.facebook.com/jbl.incorporadora.urbanismo.e.empreendimentos/", "Facebook", <svg key="f" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="currentColor"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21z" /></svg>],
  ["https://youtube.com/@jblincorporadoraeurbanismo?si=_-M7hVRRYzh_plcI", "YouTube", <svg key="y" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2 26 26 0 002 12a26 26 0 00.4 4.8 2.5 2.5 0 001.8 1.8c1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8A26 26 0 0022 12a26 26 0 00-.4-4.8zM10 15.1V8.9l5.2 3.1z" /></svg>],
  ["https://www.linkedin.com/in/jbl-incorporadora-e-urbanismo-553154437/", "LinkedIn", <svg key="l" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M4.5 8.8h3.2V20H4.5zM6.1 3.8a1.9 1.9 0 110 3.8 1.9 1.9 0 010-3.8zM9.8 8.8h3.1v1.6c.5-.9 1.6-1.9 3.3-1.9 3.4 0 4 2.2 4 5.1V20H17v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V20H9.8z" /></svg>],
];

/** Setas douradas entre as contas do VGV (mesma lógica do site) */
function useChainArrows(ref: React.RefObject<HTMLDivElement>, deps: unknown[]) {
  useEffect(() => {
    const ch = ref.current;
    if (!ch) return;
    const g = ch.querySelector<SVGGElement>(".chain-paths");
    const draw = () => {
      if (!g) return;
      const C = ch.getBoundingClientRect();
      g.innerHTML = "";
      ch.querySelectorAll<HTMLElement>(".carry[data-from]").forEach((t) => {
        const src = ch.querySelector<HTMLElement>(`[data-id="${t.dataset.from}"]`);
        if (!src) return;
        const sr = src.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        const srcCard = src.closest(".calc")!.getBoundingClientRect();
        const x1 = sr.left + sr.width / 2 - C.left;
        const y1 = sr.bottom - C.top;
        const yg = srcCard.bottom - C.top + 15;
        const lx = Math.max(6, tr.left - C.left - 13);
        const ty = tr.top + tr.height / 2 - C.top;
        const tx = tr.left - C.left - 3;
        const r = 8;
        const p = `M${x1},${y1} V${yg - r} Q${x1},${yg} ${x1 - r},${yg} H${lx + r} Q${lx},${yg} ${lx},${yg + r} V${ty - r} Q${lx},${ty} ${lx + r},${ty} H${tx}`;
        g.insertAdjacentHTML(
          "beforeend",
          `<circle cx="${x1}" cy="${y1}" r="3.5" fill="var(--gold)"/><path class="ln" d="${p}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arr)"/>`,
        );
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(ch);
    window.addEventListener("resize", draw);
    document.fonts?.ready.then(draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Centraliza o valor por extenso embaixo do resultado (mesma lógica do site: .v-ext[data-center]) */
function useCenterExtenso(root: React.RefObject<HTMLDivElement>, deps: unknown[]) {
  useEffect(() => {
    const run = () => {
      root.current?.querySelectorAll<HTMLElement>(".v-ext[data-center]").forEach((x) => {
        const t = root.current!.querySelector<HTMLElement>(`#${x.dataset.center}`);
        const i = x.firstElementChild as HTMLElement | null;
        if (!t || !i) return;
        i.style.marginLeft = "0";
        const xr = x.getBoundingClientRect();
        const tr = t.getBoundingClientRect();
        const w = i.getBoundingClientRect().width;
        let m = tr.left + tr.width / 2 - xr.left - w / 2;
        m = Math.max(0, Math.min(m, xr.width - w));
        i.style.marginLeft = `${m}px`;
      });
    };
    run();
    window.addEventListener("resize", run);
    document.fonts?.ready.then(run);
    return () => window.removeEventListener("resize", run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function JblPadrao(props: TemplateProps) {
  const { project, inputs, options, mode, formato } = props;
  const r = useMemo(() => calcular(inputs), [inputs]);
  const editing = mode === "edit";
  const [scroll, setScroll] = useState(0);
  const [menu, setMenu] = useState(false);
  const [pick, setPick] = useState(r.cenarios.length - 1);
  const chain = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useChainArrows(chain, [r, props.overrides]);
  useCenterExtenso(root, [r, props.overrides]);
  useEffect(() => setPick(Math.max(0, r.cenarios.findIndex((c) => c.meses === r.nParcelas))), [r]);

  useEffect(() => {
    const f = () => {
      const h = document.documentElement;
      const m = h.scrollHeight - h.clientHeight;
      setScroll(m > 0 ? Math.min(100, (h.scrollTop / m) * 100) : 0);
    };
    window.addEventListener("scroll", f, { passive: true });
    f();
    return () => window.removeEventListener("scroll", f);
  }, []);

  // ----- destinatário: textos que falam com quem recebe a proposta -----
  const d = tratamento(options.destinatario);
  /** Texto que muda com o destinatário: a edição vale só para aquele tipo (chave "txt.<k>@<tipo>") */
  const D = ({ k, children, html, multiline }: { k: string; children: string; html?: boolean; multiline?: boolean }) => (
    <T k={`${k}@${d.tipo}`} html={html} multiline={multiline}>{children}</T>
  );

  // ----- números usados nos textos -----
  const gleba = project.name;
  const local = `${project.municipio}, ${project.uf}`;
  const ha = inputs.areaTotal / 10000;
  const ter = fmtPct(r.terrenistaPct, 0);
  const terN = Math.round(r.terrenistaPct * 100);
  const n = r.nParcelas;
  const anos = fmtNum(n / 12, n % 12 ? 1 : 0);
  const reaj = fmtPct(r.reajuste);
  const lotes2 = fmtNum(r.lotes, 2);
  const campos = Math.round(inputs.areaTotal / 7140);
  const jurosAnoEq = fmtPct(inputs.jurosMes * 12);
  const indice = inputs.indice || "IPCA";
  const data = fmtLongDate(props.date);
  const dataCurta = new Date(props.date).toLocaleDateString("pt-BR");
  const mi = (v: number) => `R$ ${fmtNum(v / 1e6, 1)} mi`;
  const pctTxt = (v: number) => fmtPct(v, 0);
  const ext = (v: number) => `(${extensoReais(v)})`;
  const sim = r.cenarios[pick] ?? r.principal;
  const maxTot = Math.max(...r.cenarios.map((c) => c.carteiraTer), 1);
  const circ = 2 * Math.PI * 70;
  const pie = [r.terrenistaPct, Math.max(r.jblPct, 0), r.infraPct].map((p) => (p * circ).toFixed(2));
  const [pdfPages, setPdfPages] = useState(props.pdfPages ?? null);
  const [gerando, setGerando] = useState(false);
  // página pública sem PDF atualizado: gera em segundo plano para mostrar o número de páginas
  useEffect(() => {
    if (mode !== "public" || props.printing || props.pdfPages || !props.pdfUrl) return;
    fetch(`${props.pdfUrl}?info=1`).then((r) => (r.ok ? r.json() : null)).then((j) => j?.pages && setPdfPages(j.pages)).catch(() => {});
  }, [mode, props.printing, props.pdfPages, props.pdfUrl]);
  async function abrirPdf() {
    if (!props.pdfUrl || mode !== "public") return window.print();
    const w = window.open("", "_blank");
    setGerando(true);
    try {
      const r = await fetch(`${props.pdfUrl}?info=1`);
      if (!r.ok) throw new Error();
      if (w) w.location.href = props.pdfUrl;
      else window.location.href = props.pdfUrl;
    } catch {
      w?.close();
      window.print();
    } finally {
      setGerando(false);
    }
  }
  const go = (e: React.MouseEvent) => editing && e.preventDefault();

  // fecho da proposta: embaixo da carta de intenção (ou no fim, quando a proposta não tem carta)
  const fecho = (
    <p className="lead fecho" style={{ marginTop: 28 }}><T k="fimFecho2">Com os nossos melhores cumprimentos e estima, colocamo-nos à disposição para dirimir quaisquer dúvidas ou esclarecimentos que se façam necessários.</T></p>
  );

  const navLinks: [string, string, string][] = [
    ["#participacao", "nav1", "Sua participação"],
    ["#recebimentos", "nav2", "Recebimentos"],
    ["#execucao", "nav3", "Execução"],
    ["#aviso-legal", "nav4", "Aviso legal"],
  ];

  return (
    <EditProvider overrides={props.overrides} base={formato.overrides} editable={editing} onSave={props.onSave}>
      <ThemeRoot className={`jblt ${editing ? "editing" : ""} ${mode !== "public" ? "embedded" : ""}`}>
        <div ref={root}>
          {mode === "public" && !props.printing && <Tracker token={props.token} />}

          <nav className="nav" aria-label="Seções da proposta">
            <div className="wrap">
              <a className="mark" href="#topo" onClick={go} aria-label="JBL Incorporadora e Urbanismo">
                <Img k="logoMenu" className="lockup" src="/brand/lockup.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" />
              </a>
              <span className="links">
                {navLinks.map(([h, k, l]) => (
                  <Lnk key={k} k={k} href={h} className="lnk"><T k={k}>{l}</T></Lnk>
                ))}
              </span>
              <Lnk k="ctaPdf" href="#pdf" className="cta js-pdf" onDefault={abrirPdf}>
                <T k="ctaPdf1">Baixar</T> <span className="cta-long"><T k="ctaPdf2">proposta em</T> </span><T k="ctaPdf3">PDF</T>
              </Lnk>
              <button type="button" className="burger" aria-label={menu ? "Fechar menu" : "Abrir menu"} aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                <span /><span /><span />
              </button>
            </div>
            <div className="mnav" hidden={!menu}>
              {navLinks.map(([h, k, l]) => (
                <a key={k} href={h} onClick={() => setMenu(false)}><T k={k}>{l}</T></a>
              ))}
            </div>
            <div className="progress" aria-hidden="true" style={{ width: `${scroll}%` }} />
          </nav>

          {/* CAPA */}
          <Sec k="capa" as="header" className="cover" id="topo">
            <div className="wrap">
              <div className="cover-meta">
                <span><T k="capaMeta1">Proposta técnica e comercial</T></span>
                <span><T k="capaMeta2">{`${gleba} · ${local}`}</T></span>
              </div>
              <div className="hero">
                <div className="hero-left">
                  <div className="eyebrow"><T k="capaEyebrow">Uma parceria para desenvolver sua área</T></div>
                  <h1><T k="h1" html>{`Sua terra pode dar<br class="d"> origem a um novo<br class="d"> bairro. <em>E a uma nova<br class="d"> receita.</em>`}</T></h1>
                </div>
                <div className="hero-right">
                  <span className="chip"><T k="capaChip2" html>{`Proposta de participação do proprietário: <b class="chip-pct">${ter}</b>`}</T></span>
                  <p><T k="capaP1">Você participa com a gleba. A JBL propõe financiar e executar a infraestrutura, conduzir o projeto e comercializar os lotes.</T></p>
                  <p><D k="capaP2">{d.pick(
                    "Veja abaixo quanto está projetado para o proprietário, como o recebimento funciona e quais são as condições da parceria.",
                    `Veja abaixo quanto está projetado para ${d.quem}, como o recebimento funciona e quais são as condições da parceria.`,
                    "Veja abaixo quanto está projetado para você, como o recebimento funciona e quais são as condições da parceria.",
                  )}</D></p>
                  <div className="cover-ctas">
                    <Lnk k="capaBtn" href="#participacao" className="cover-cta ghost"><T k="capaBtn">Ver minha participação ↓</T></Lnk>
                    {options.cartaIntencao && (
                      <Lnk k="capaCarta" href="#intencao" className="cover-cta"><T k="capaCarta">Preencher carta de intenção</T></Lnk>
                    )}
                  </div>
                </div>
              </div>
              {project.aerialImage && (
                <figure className="photo hero-photo">
                  <Img k="fotoCapa" src={project.aerialImage} alt={`Vista aérea da gleba ${gleba}, contornada em vermelho`} />
                  <div className="photo-bar">
                    <b><T k="fotoLegenda">{`Gleba ${gleba} · ${fmtNum(ha, 4)} hectares`}</T></b>
                    <span><T k="fotoNota">Imagem fornecida para a proposta. Demarcação indicativa; limites sujeitos à documentação técnica.</T></span>
                  </div>
                </figure>
              )}
              <div className="hero-stats">
                <div><b><V k="statArea">{`${fmtNum(inputs.areaTotal)} m²`}</V></b><span><T k="statAreaD">área total indicada</T></span></div>
                <div><b><V k="statUtil">{`${fmtNum(r.areaUtil)} m²`}</V></b><span><T k="statUtilD">{`área aproveitável estimada (${pctTxt(inputs.aproveitamento)} da área total)`}</T></span></div>
                <div><b><V k="statLote">{`${fmtNum(inputs.metragemLote, 0)} m²`}</V></b><span><T k="statLoteD">{`lotes de ${fmtNum(inputs.frenteLote, 0)} × ${fmtNum(r.fundoLote, 0)} metros`}</T></span></div>
                <div><b><V k="statMatricula">{project.matricula ?? "a definir"}</V></b><span><T k="statMatriculaD">matrícula do imóvel</T></span></div>
              </div>
              <div className="quote">
                <blockquote>
                  <T k="frase">“O empreendimento mais importante para nós é o realizado!”</T>
                  <small><T k="fraseAutor">Marcelo Aguilar · Diretor de Expansão</T></small>
                </blockquote>
                <div className="tech">
                  <T k="tecnicos2" html>{`<span class="tech-lbl">Profissionais chefes designados para o projeto</span>Eng.º Felipe Stampini Oliveira Lopes · CREA 248492/D<br>Arquiteto Fábio Barros Belizário · CAU A117931-4<br><strong class="tech-date">São Paulo, ${data}</strong>`}</T>
                </div>
              </div>
            </div>
          </Sec>

          <main className="wrap">
            {/* CARTA */}
            <Sec k="carta" as="article" className="letter" id="carta">
              <div className="letterhead">
                <div className="eyebrow"><T k="cartaEyebrow">Uma parceria para realizar</T></div>
                <Img k="logoCarta" src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" className="lh-logo" />
              </div>
              <h2 style={{ margin: "6px 0 18px", fontSize: "clamp(26px,4vw,34px)" }}>
                <D k="saudacao">{d.saudacao}</D>
              </h2>
              <p><D k="carta1">{d.pick(
                `Recebam nosso abraço e nosso agradecimento pela oportunidade de conhecer a história e o potencial da gleba ${gleba}. Sabemos que uma área carrega o trabalho, os planos e o cuidado de uma família. É com respeito por essa trajetória que apresentamos nossa Proposta Técnica e Comercial de parceria para o parcelamento do solo sob o modelo de ${formato.modelo} (${formato.lei}), para vossa análise e apreciação. A proposta refere-se à gleba ${gleba}, com área total de ${fmtNum(inputs.areaTotal)} m², localizada em ${project.municipio} - ${project.uf}.`,
                `Receba nosso abraço e nosso agradecimento pela oportunidade de conhecer a história e o potencial da gleba ${gleba}. Sabemos que uma área carrega o trabalho, os planos e o cuidado de quem a construiu. É com respeito por essa trajetória que levamos ao seu encontro nossa Proposta Técnica e Comercial de parceria para o parcelamento do solo sob o modelo de ${formato.modelo} (${formato.lei}), para sua análise e apreciação. A proposta refere-se à gleba ${gleba}, com área total de ${fmtNum(inputs.areaTotal)} m², localizada em ${project.municipio} - ${project.uf}.`,
                `Montamos esta proposta especialmente para a sua apreciação, e esperamos que goste. Agradecemos a oportunidade de conhecer a história e o potencial da gleba ${gleba}, e é com respeito por essa trajetória que apresentamos nossa Proposta Técnica e Comercial de parceria para o parcelamento do solo sob o modelo de ${formato.modelo} (${formato.lei}). A proposta refere-se à gleba ${gleba}, com área total de ${fmtNum(inputs.areaTotal)} m², localizada em ${project.municipio} - ${project.uf}.`,
              )}</D></p>
              <p><T k="carta2">A JBL Incorporadora e Urbanismo é uma empresa especializada em loteamentos e urbanização, com ampla experiência de mercado e profissionais altamente qualificados. Cada novo projeto reúne especialistas em arquitetura, engenharia, ciências biológicas, geologia, direito, administração, contabilidade, perícia de avaliação, topografia, comercial e marketing, viabilizando empreendimentos desde o padrão econômico até o de alto padrão.</T></p>
              <p><D k="carta3">{d.pick(
                "Nas próximas páginas, compartilhamos as atividades e os números deste projeto, para que vocês possam avaliar a parceria com tranquilidade e clareza. Queremos construir essa decisão juntos, ouvindo suas expectativas e esclarecendo cada dúvida. Nossa estrutura física, equipe capacitada e experiência estão à disposição da família. Será um prazer recebê-los para uma conversa e agendar uma reunião.",
                `Nas próximas páginas, compartilhamos as atividades e os números deste projeto, para que você possa avaliar a parceria com tranquilidade e clareza. Queremos construir essa decisão juntos, ouvindo suas expectativas e esclarecendo cada dúvida. Nossa estrutura física, equipe capacitada e experiência estão à sua disposição. Será um prazer ${d.recebe} para uma conversa e agendar uma reunião.`,
                `Nas próximas páginas, compartilhamos as atividades e os números deste projeto, para que você possa avaliar a parceria com tranquilidade e clareza. Queremos construir essa decisão juntos, ouvindo suas expectativas e esclarecendo cada dúvida. Nossa estrutura física, equipe capacitada e experiência estão à sua disposição. Será um prazer ${d.recebe} para uma conversa e agendar uma reunião.`,
              )}</D></p>
              <p className="sign"><T k="assinatura" multiline>{"Atenciosamente,\nMarcelo Aguilar"}</T><small><T k="assinaturaCargo">Diretor de Expansão</T></small></p>
            </Sec>

            <Sec k="ideia" as="div" className="big-idea">
              <div className="eyebrow"><T k="ideiaEyebrow">A ideia em uma frase</T></div>
              <h2 style={{ marginTop: 6 }}><D k="ideia">{d.pick(
                "Vocês entram com o terreno. A JBL entra com o dinheiro e o trabalho. O que for vendido é dividido.",
                "Você entra com o terreno. A JBL entra com o dinheiro e o trabalho. O que for vendido é dividido.",
                "Você entra com o terreno. A JBL entra com o dinheiro e o trabalho. O que for vendido é dividido.",
              )}</D></h2>
              <div className="tiles" style={{ marginTop: 20 }}>
                <div className="tile"><h3><D k="ideia1t">{`🌳 ${d.Quem}`}</D></h3><p><T k="ideia1">Entra com a terra. Não coloca dinheiro nas obras de infraestrutura previstas.</T></p></div>
                <div className="tile"><h3><T k="ideia2t">🏗️ A JBL</T></h3><p><T k="ideia2">Cuida dos estudos, aprovações, infraestrutura, marketing, vendas e da carteira de recebíveis (os boletos dos compradores).</T></p></div>
                <div className="tile"><h3><T k="ideia3t">🤝 Os parceiros</T></h3><p><D k="ideia3">{`Dividem o resultado. ${d.Quem} escolhe receber em dinheiro, em lotes ou das duas formas.`}</D></p></div>
              </div>
              <p className="note" style={{ marginTop: 12 }}><T k="ideiaNota">Não há aporte de capital do proprietário para a infraestrutura prevista. Impostos e outros custos são tratados à parte (veja o passo 11).</T></p>
            </Sec>

            {/* PARTE: JBL */}
            <div className="part"><div className="part-label"><T k="parteA">Primeiro: quem é a JBL</T></div></div>

            <Sec k="grupo" className="step" id="grupo">
              <div className="step-head"><div className="badge alt">A</div><div>
                <h2><T k="aTitulo">O grupo</T></h2>
                <p><T k="aSub">Uma empresa feita para transformar terrenos em bairros planejados.</T></p>
              </div></div>
              <div className="content grupo grupo-solo">
                <div className="grupo-text">
                  <p><T k="a1">O grupo JBL Incorporadora e Urbanismo fundamenta sua atuação na experiência de seu corpo diretivo e colaboradores diretos com amplo conhecimento de mercado, um time com know-how em empreendimentos com o propósito de transformar cidades e vidas das pessoas.</T></p>
                  <p><T k="a2">Nosso propósito vai além do desenvolvimento de projetos. Temos plena consciência e convicção de que o nosso negócio gira em torno de pessoas, sejam elas clientes, colaboradores ou parceiros. Por isso, investimos constantemente na gestão de recursos humanos, em treinamento, acompanhamento e supervisão de todas as operações de nossas equipes, que atuam direta ou indiretamente com todos os envolvidos e têm papel fundamental na disseminação de nossos valores e preceitos de qualidade, transparência e idoneidade.</T></p>
                  <p><T k="a3">A JBL Incorporadora e Urbanismo tornou-se especialista no desenvolvimento de loteamentos e gestão de alta performance com atuação ampla no território nacional, desenvolvendo projetos ambiciosos com o máximo potencial de valorização para moradia ou investimentos.</T></p>
                </div>
              </div>
            </Sec>

            <Sec k="empresas" className="step" id="empresas">
              <div className="step-head"><div className="badge alt">B</div><div>
                <h2><T k="bTitulo">As 7 empresas do grupo</T></h2>
                <p><T k="bSub">Cada uma cuida de uma parte do caminho, do terreno até o cliente pagando a parcela.</T></p>
              </div></div>
              <div className="content">
                <div className="cards">
                  {EMPRESAS.map(([t, dsc], i) => (
                    <div key={i} className="card" style={i === EMPRESAS.length - 1 ? { gridColumn: "1/-1" } : undefined}>
                      <b><T k={`emp${i}t`}>{t}</T></b><p><T k={`emp${i}`}>{dsc}</T></p>
                    </div>
                  ))}
                </div>
              </div>
            </Sec>

            <Sec k="missao" className="step" id="missao">
              <div className="step-head"><div className="badge alt">C</div><div>
                <h2><T k="cTitulo">Missão, visão e valores</T></h2>
                <p><T k="cSub">O que a JBL quer fazer, aonde quer chegar e no que acredita.</T></p>
              </div></div>
              <div className="content">
                <div className="tiles">
                  <div className="tile"><h3><T k="missaoT">Missão</T></h3><p><T k="missao">Desenvolver projetos de empreendimentos que transformem espaços em ambientes sustentáveis, inovadores e funcionais, contribuindo para o desenvolvimento de cidades e o bem-estar das pessoas.</T></p></div>
                  <div className="tile"><h3><T k="visaoT">Visão</T></h3><p><T k="visao">Ser referência no mercado de urbanismo e empreendimento, reconhecida pela excelência em projetos que promovem a qualidade de vida e o crescimento sustentável das cidades.</T></p></div>
                  <div className="tile"><h3><T k="valoresT">Valores</T></h3><p><T k="valores">Sustentabilidade, inovação, ética, qualidade e responsabilidade social. Esses elementos ajudam a comunicar os princípios e objetivos da JBL, transmitindo uma imagem sólida e confiável da empresa.</T></p></div>
                </div>
              </div>
            </Sec>

            <Sec k="como" className="step" id="como">
              <div className="step-head"><div className="badge alt">D</div><div>
                <h2><T k="dTitulo">Como a JBL trabalha com donos de terra</T></h2>
                <p><T k="dSub">Descubra o potencial de valorização da sua área.</T></p>
              </div></div>
              <div className="content">
                <p><T k="d1">A JBL adquire áreas acima de 40 mil metros quadrados (4 hectares) a preços justos ou estabelece parcerias, sem ou com aporte financeiro. Queremos propor muito mais que um negócio: consolidar uma parceria de sucesso para você e sua família ou para sua empresa, e fazer o seu projeto brilhar.</T></p>
                <p><T k="d2" html>{"No modelo de parceria, o proprietário cede a gleba para o desenvolvimento do empreendimento e participa financeiramente da carteira de recebíveis, garantindo uma <strong>renda passiva mensal de até 20 anos</strong> por meio de uma conta bancária compartilhada com a JBL. Existem três jeitos de receber:"}</T></p>
                <div className="tiles">
                  <div className="tile"><h3><T k="d3t">💰 Financeira</T></h3><p><D k="d3">{`${d.Quem} recebe a sua parte em dinheiro, todo mês, conforme os clientes pagam as parcelas.`}</D></p></div>
                  <div className="tile"><h3><T k="d4t">🏡 Física em lotes</T></h3><p><D k="d4">{`${d.Quem} recebe lotes prontos, para vender quando quiser ou guardar como investimento.`}</D></p></div>
                  <div className="tile"><h3><T k="d5t">🔀 Híbrida</T></h3><p><T k="d5b">Uma parte da participação em lotes e outra em recebimentos financeiros, em proporção a negociar.</T></p></div>
                </div>
              </div>
            </Sec>

            {/* PARTE: PROJETO */}
            <div className="part"><div className="part-label"><T k="parteB">Agora: o projeto no seu terreno, passo a passo</T></div></div>

            {/* 1 */}
            <Sec k="terreno" className="step" id="terreno">
              <div className="step-head"><div className="badge">1</div><div>
                <h2><T k="s1Titulo">O tamanho do terreno</T></h2>
                <p><T k="s1Sub">Nem todo o terreno vira lote. Uma parte precisa virar rua, calçada e área verde, como em qualquer bairro.</T></p>
              </div></div>
              <div className="content">
                <div className="tiles">
                  <div className="tile"><div className="k"><T k="s1k1">Terreno inteiro</T></div><div className="v num"><V k="s1v1">{`${fmtNum(inputs.areaTotal)} m²`}</V></div><div className="d"><T k="s1d1">{`${fmtNum(ha, 4)} hectares. Mais ou menos ${campos} campos de futebol.`}</T></div></div>
                  <div className="tile"><div className="k"><T k="s1k2">{`Vira lotes (${pctTxt(inputs.aproveitamento)})`}</T></div><div className="v num"><V k="s1v2">{`${fmtNum(r.areaUtil)} m²`}</V></div><div className="d"><T k="s1d2">{`${fmtNum(r.areaUtil / 10000, 4)} hectares aproveitáveis.`}</T></div></div>
                  <div className="tile hl"><div className="k"><T k="s1k3">Número de lotes</T></div><div className="v num"><V k="s1v3b">{lotes2}</V></div><div className="d"><T k="s1d3">{`Estimativa do estudo. Na prática, cerca de ${r.lotesInteiros} a ${r.lotesInteiros + 1} lotes.`}</T></div></div>
                </div>
                <div className="calc num">
                  <span className="n">=</span><span className="t"><T k="s1CalcT">De onde vem o número de lotes</T></span>
                  <span className="f"><span><V k="s1f1">{`${fmtNum(r.areaUtil)} m²`}</V></span><span className="op">÷</span><span><V k="s1f2">{`${fmtNum(inputs.metragemLote, 0)} m² por lote`}</V></span><span className="op">=</span><span className="res"><V k="s1f3b">{`${lotes2} lotes equivalentes`}</V></span></span>
                </div>
                <p className="note"><T k="s1Nota2">Lotes equivalentes é uma conta para estimar valores. O número exato de lotes depende do projeto aprovado.</T></p>
                <div className="split" role="img" aria-label="Parte do terreno vira lotes, outra parte vira ruas, calçadas, áreas verdes e lazer">
                  <div className="s-lots" style={{ flex: inputs.aproveitamento * 100 }}><T k="s1Bar1">Parte vira lotes</T></div>
                  <div className="s-streets" style={{ flex: (1 - inputs.aproveitamento) * 100 }}><T k="s1Bar2">Outra parte vira ruas, calçadas, áreas verdes e lazer</T></div>
                </div>
                <div className="lot">
                  <svg width="120" height="150" viewBox="0 0 120 150" aria-hidden="true">
                    <rect x="30" y="14" width="48" height="126" rx="4" fill="#EFDDB3" stroke="var(--gold-deep)" strokeWidth="3" />
                    <text x="54" y="80" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="400" fontSize="16" fill="var(--navy)">{fmtNum(inputs.metragemLote, 0)}</text>
                    <text x="54" y="96" textAnchor="middle" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="12" fill="var(--muted)">m²</text>
                    <text x="54" y="10" textAnchor="middle" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="12" fontWeight="700" fill="var(--muted)">{fmtNum(inputs.frenteLote, 0)} m</text>
                    <text x="84" y="80" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="12" fontWeight="700" fill="var(--muted)">{fmtNum(r.fundoLote, 0)} m</text>
                  </svg>
                  <p><T k="s1Lote" html>{`<strong>Cada lote tem ${fmtNum(inputs.metragemLote, 0)} m²</strong>: ${fmtNum(inputs.frenteLote, 0)} metros de frente por ${fmtNum(r.fundoLote, 0)} metros de fundo, conforme a lei de parcelamento do solo do município. É o tamanho de um terreno comum para construir uma casa.`}</T></p>
                </div>
              </div>
            </Sec>

            {/* 2 */}
            <Sec k="obras" className="step" id="obras">
              <div className="step-head"><div className="badge">2</div><div>
                <h2><T k="s2Titulo">Tudo o que será construído</T></h2>
                <p><T k="s2Sub">Para virar bairro, o terreno precisa de muita coisa. Esta é a lista completa, com as quantidades médias previstas no processo de aprovação. Tudo será financiado e executado única e exclusivamente pela JBL.</T></p>
              </div></div>
              <div className="content">
                <h3><T k="s2h1">Infraestrutura principal</T></h3>
                <TabelaObras secao="infra" base={formato.infra} r={r} colunas={3} className="tbl tbl-infra tbl-infra1" />
                <p className="note"><T k="s2Unid">ml = metros lineares (comprimento) · m² = metros quadrados (área) · un. = unidades</T></p>

                <h3><T k="s2h2">Infraestrutura complementar</T></h3>
                <TabelaObras secao="complementar" base={formato.complementar} r={r} colunas={2} className="tbl tbl-infra tbl-infra2" />

                <h3><T k="s2h3">Lazer e benfeitorias (após estudo de viabilidade)</T></h3>
                <ListaBenfeitorias base={formato.benfeitorias} />
                <p className="note"><T k="s2Nota2">Todos os itens estão a projetar. Outras benfeitorias poderão ser identificadas ao longo dos processos de viabilidade e de aprovação.</T></p>
                <p className="tip"><D k="s2Tip2">{`📱 Além do acompanhamento pessoal, ${d.quem} acompanha as obras por um aplicativo próprio da JBL (JBL Facilita), com relatórios, fotos e vídeos a cada 15 dias. Os compradores dos lotes também terão serviços como segunda via de boletos.`}</D></p>
              </div>
            </Sec>

            {/* 3 */}
            <Sec k="execucao" className="step" id="execucao">
              <div className="step-head"><div className="badge">3</div><div>
                <h2><T k="s3Titulo">Quanto custam as obras, e quem paga</T></h2>
                <p><T k="s3Sub">O custo é a área dos lotes multiplicada pelo valor da infraestrutura por metro quadrado.</T></p>
              </div></div>
              <div className="content">
                <div className="calc num">
                  <span className="n">=</span><span className="t"><T k="s3CalcT">A conta</T></span>
                  <span className="f"><span><V k="s3f1">{`${fmtNum(r.areaObras)} m²`}</V></span><span className="op">×</span><span><V k="s3f2">{`${fmtBRL(inputs.custoInfraM2)}/m²`}</V></span><span className="op">=</span><span className="res res-big"><V k="s3f3">{fmtBRL(r.custoInfra)}</V></span></span>
                </div>
                <p className="note note-lg"><T k="s3Extenso2" html>{`<span class="extenso">${ext(r.custoInfra)}</span>. Orçamento preliminar.`}</T></p>
                <div className="tiles two">
                  <div className="tile gold"><div className="k"><T k="s3k1">Quem paga as obras</T></div><div className="v"><T k="s3v1">A JBL</T></div><div className="d"><T k="s3d1">A JBL financia e executa toda a infraestrutura.</T></div></div>
                  <div className="tile hl"><div className="k"><D k="s3k2">{`Quanto ${d.quem} paga`}</D></div><div className="v num" style={{ color: "var(--good)" }}><T k="s3v2">R$ 0</T></div><div className="d"><T k="s3d2b">Em nenhuma hipótese será solicitado aos proprietários dinheiro para essas obras.</T></div></div>
                </div>
                <p className="gantt-intro" style={{ marginTop: 8 }}><T k="s4Obras">As obras são feitas em etapas ao longo de 48 meses (4 anos). Cronograma ilustrativo:</T></p>
                <div className="gantt-wrap"><div className="gantt" role="table" aria-label="Cronograma de implantação">
                  <div className="h" style={{ textAlign: "left" }}><T k="gObra">Obra</T></div>
                  <div className="h">1º ano<br /><span className="hm">meses </span>1–12</div><div className="h">2º ano<br />13–24</div><div className="h">3º ano<br />25–36</div><div className="h">4º ano<br />37–48</div>
                  {[["Drenagem e esgoto", [1, 0, 0, 0]], ["Água", [0, 1, 0, 0]], ["Elétrica", [0, 0, 1, 0]], ["Pavimentação", [0, 0, 0, 1]], ["Outros", [1, 1, 1, 1]]].map(([l, on], i) => (
                    <Fragment key={i}>
                      <div className="l"><T k={`g${i}`}>{l as string}</T></div>
                      {(on as number[]).map((x, j) => <div key={j} className={`c ${x ? "on" : ""}`} />)}
                    </Fragment>
                  ))}
                </div></div>
                <ol className="tl-mobile" aria-label="Cronograma de implantação">
                  {["Drenagem e esgoto", "Rede de água", "Rede elétrica", "Pavimentação (asfalto)"].map((w, i) => (
                    <li key={i}><span className="yr">{i + 1}º ano<small>meses {i * 12 + 1} a {(i + 1) * 12}</small></span><span className="works"><b><T k={`tl${i}`}>{w}</T></b><i>+ outros serviços</i></span></li>
                  ))}
                </ol>
                <div className="prazo-max" role="note">
                  <span className="pm-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></svg></span>
                  <p><T k="prazoMax" html>{"<strong>48 meses é o prazo máximo.</strong> As obras podem ser concluídas antes, em <strong>36</strong> ou até em <strong>24 meses</strong>, a depender da exigência de cada município."}</T></p>
                </div>
                <p className="tip gantt-tip"><T k="s4Tip" html>{"<strong>A JBL também cuida de:</strong> aprovações nas entidades competentes (municipais, estaduais ou federais), administração global, emissão de boletos, carteira de recebíveis, gestão financeira, controladoria, apontamentos, tratativas com prestadores de serviços e demais serviços, além de marketing amplo para as estratégias de comercialização e vendas."}</T></p>
              </div>
            </Sec>

            {/* 4 */}
            <Sec k="cronograma" className="step" id="cronograma">
              <div className="step-head"><div className="badge">4</div><div>
                <h2><T k="s4Titulo">O caminho, do terreno até o pagamento</T></h2>
                <p><T k="s4Sub2">São 6 etapas. As obras de infraestrutura começam junto com as vendas.</T></p>
              </div></div>
              <div className="content">
                <div className="steps6">
                  {ETAPAS6.map(([t, dsc], i) => (
                    <div key={i} className="s6"><span className="s6n">{String(i + 1).padStart(2, "0")}</span><b><T k={`et2${i}t`}>{t}</T></b><p><T k={`et2${i}`}>{dsc}</T></p></div>
                  ))}
                </div>
              </div>
            </Sec>

            {/* 5 */}
            <Sec k="vgv" className="step" id="vgv">
              <div className="step-head"><div className="badge">5</div><div>
                <h2><T k="s5Titulo">Quanto vale tudo isso (VGV)</T></h2>
                <p><T k="s5Sub2">VGV (Valor Geral de Vendas): o quanto de dinheiro entra se todos os lotes forem vendidos. Vamos fazer a conta em 6 passos.</T></p>
              </div></div>
              <div className="content">
                <div className="chain" ref={chain}>
                  <svg className="chain-svg" aria-hidden="true">
                    <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--gold)" /></marker></defs>
                    <g className="chain-paths" />
                  </svg>
                  <div className="calc num">
                    <span className="n">1</span><span className="t"><T k="v1t">Preço do lote à vista</T></span>
                    <span className="f"><span><V k="v1a">{`${fmtNum(inputs.metragemLote, 0)} m²`}</V></span><span className="op">×</span><span><V k="v1b">{`${fmtBRL(inputs.valorM2)} por m`}</V><sup className="sq">2</sup><sup className="fn">1</sup></span><span className="op">=</span><span className="res" id="v1" data-id="v1"><V k="v1r">{fmtBRL(r.valorLote)}</V></span></span>
                  </div>
                  <div className="calc num">
                    <span className="n">2</span><span className="t"><T k="v2t">{`Entrada paga pelo comprador (${pctTxt(inputs.entradaPct)})`}</T></span>
                    <span className="f"><span className="carry" data-from="v1">{fmtBRL(r.valorLote)}</span><span className="op">−</span><span className="idx"><V k="v2b">{fmtBRL(r.entrada)}</V><small><T k="v2bs2">corretagem + marketing</T></small></span><span className="op">=</span><span className="res" id="v2" data-id="v2"><V k="v2r">{fmtBRL(r.valorLote - r.entrada)}</V></span></span>
                  </div>
                  <div className="calc num">
                    <span className="n">3</span><span className="t"><T k="v3t">Saldo financiado a prazo</T></span>
                    <span className="f"><span className="carry" data-from="v2">{fmtBRL(r.valorLote - r.entrada)}</span><span className="op">×</span><span className="idx"><span><V k="v3b">{fmtNum(inputs.multiplicador, 2)}</V><sup className="fn fn-ast">*</sup></span><small><T k="v3bs">índice multiplicador a prazo</T></small></span><span className="op">=</span><span className="res" id="v3" data-id="v3"><V k="v3r">{fmtBRL(r.saldoPrazo)}</V></span></span>
                  </div>
                  <div className="calc num">
                    <span className="n">4</span><span className="t"><T k="v4t">VGV a prazo, antes da projeção</T></span>
                    <span className="f"><span className="carry" data-from="v3">{fmtBRL(r.saldoPrazo)}</span><span className="op">×</span><span><V k="v4b2">{`${lotes2} lotes`}</V></span><span className="op">=</span><span className="res" id="v4" data-id="v4"><V k="v4r">{fmtBRL(r.vgvPrazoSemReajuste)}</V></span></span>
                  </div>
                  <div className="calc num">
                    <span className="n">5</span><span className="t"><T k="v5t">{`VGV global projetado (${n} meses, com reajuste anual²)`}</T></span>
                    <span className="f"><span className="carry" data-from="v4">{fmtBRL(r.vgvPrazoSemReajuste)}</span><span className="op">+</span><span><V k="v5b">{`reajuste de ${reaj} ao ano por ${anos} anos`}</V></span><span className="op">=</span><span className="brk" aria-hidden="true" /><span className="res" id="v6" data-id="v6"><V k="v5r">{fmtBRL(r.principal.carteiraEmp)}</V></span><span className="v6-ext"><V k="v5ext">{ext(r.principal.carteiraEmp)}</V></span></span>
                  </div>
                  <div className="calc num">
                    <span className="n">6</span><span className="t"><T k="v6t">VGV total à vista</T></span>
                    <span className="f"><span><V k="v6a2">{`${lotes2} lotes`}</V></span><span className="op">×</span><span className="carry">{fmtBRL(r.valorLote)}</span><span className="op">=</span><span className="res res-big" id="v7"><V k="v6r">{fmtBRL(r.vgvAvista)}</V></span><span className="v-ext" data-center="v7"><span><V k="v6ext">{ext(r.vgvAvista)}</V></span></span></span>
                  </div>
                </div>
                <div className="note">
                  <p><T k="v5n1">{`¹ ${fmtBRL(inputs.valorM2)}/m²: preço de mercado estimado a partir de corretores da região e pesquisas.`}</T></p>
                  <p><T k="v5n2">{`² Reajuste anual de ${reaj}: ${indice} de ${fmtPct(inputs.ipca)} ao ano${inputs.jurosAno ? ` + juros de ${fmtPct(inputs.jurosAno)} ao ano` : ""} + juros de ${fmtPct(inputs.jurosMes)} ao mês (${jurosAnoEq} ao ano). As parcelas sobem ${reaj} a cada 12 meses, por até ${n} meses, com financiamento próprio e entrada facilitada.`}</T></p>
                  <p><T k="v5n3">{`* Índice multiplicador a prazo de ${fmtNum(inputs.multiplicador, 2)} aplicado sobre o saldo de ${fmtBRL(r.valorLote - r.entrada)} (após a entrada de ${pctTxt(inputs.entradaPct)}).`}</T></p>
                </div>
                <h3><T k="v5h3">As condições da projeção</T></h3>
                <p><T k="v5p2">{`Os clientes podem comprar com financiamento próprio da JBL em até ${n} meses no boleto, com entrada facilitada. Os resultados dependem das condições contratuais de ${indice}, juros e preço a prazo.`}</T></p>
                <div className="tiles four tiles-rates">
                  <div className="tile"><div className="k"><T k="v5k1">{`${indice} anual`}</T></div><div className="v num v-sm"><V k="v5t1">{fmtPct(inputs.ipca)}</V></div><div className="d"><T k="v5d1">Índice de reajuste ao ano</T></div></div>
                  <div className="tile"><div className="k"><T k="v5k2">Juros mensais</T></div><div className="v num v-sm"><V k="v5t2">{fmtPct(inputs.jurosMes)}</V></div><div className="d"><T k="v5d2">Taxa mensal indicada</T></div></div>
                  <div className="tile"><div className="k"><T k="v5k3">Total anual</T></div><div className="v num v-sm"><V k="v5t3">{reaj}</V></div><div className="d"><T k="v5d3">Total anual indicado</T></div></div>
                  <div className="tile gold"><div className="k"><T k="v5k4">VGV global</T></div><div className="v num" style={{ whiteSpace: "nowrap" }}><V k="v5t4">{mi(r.principal.carteiraEmp)}</V></div><div className="d"><T k="v5d4">{`Em ${n} meses`}</T></div></div>
                </div>
                <p className="tip"><T k="v5tip">{`Por que parcelado dá mais? Porque cada parcela é corrigida pela inflação e tem juros. Quem compra em ${anos} anos paga bem mais do que quem paga à vista.`}</T></p>
              </div>
            </Sec>

            {/* 6 */}
            <Sec k="etapa1" className="step" id="etapa1">
              <div className="step-head"><div className="badge">6</div><div>
                <h2><T k="e1Titulo">A primeira etapa</T></h2>
              </div></div>
              <div className="content">
                <p className="tip gold tip-full"><T k="e1t2" html>{'Identificada a possibilidade de lançamento da primeira etapa para <span class="blank">a definir</span> lotes de <span class="blank">a definir</span> m², utilizando <span class="blank">a definir</span>% da área aproveitável.<br><br>As vendas podem começar antes de tudo ficar pronto. A primeira etapa é lançada em média até <strong>120 dias</strong> após o protocolo do projeto na prefeitura.'}</T></p>
                <div className="tiles two" style={{ marginTop: 22 }}>
                  <div className="tile"><div className="k"><T k="e1k1">VGV parcial à vista</T></div><div className="v num"><V k="e1v1">{r.etapa1 ? fmtBRL(r.etapa1.avista) : "a definir"}</V></div><div className="d"><T k="e1d1">Receita estimada da primeira etapa</T></div></div>
                  <div className="tile hl"><div className="k"><T k="e1k2">{`VGV parcial em ${n} meses`}</T></div><div className="v num v-big"><V k="e1v2">{r.etapa1 ? fmtBRL(r.etapa1.prazo) : "a definir"}</V></div><div className="d"><T k="e1d2">Projeção com correção e juros.</T></div></div>
                </div>
              </div>
            </Sec>

            {/* 7 */}
            <Sec k="participacao" className="step" id="participacao">
              <div className="step-head"><div className="badge">7</div><div>
                <h2><T k="s7Titulo2">Como o dinheiro é dividido na parceria</T></h2>
                <p className="note note-head"><T k="s7Nota">Considerando os elementos, premissas e estudos apresentados, o Grupo JBL, após análise técnica e de viabilidade do empreendimento, apresenta sua proposta de participação na parceria.</T></p>
                <p><T k="s7Sub2" html>{"Imagine que todo o dinheiro das vendas <strong>(incluindo a primeira etapa)</strong> é uma pizza. Ela é cortada em 3 partes:"}</T></p>
              </div></div>
              <div className="content">
                <div className="pie-row">
                  <svg viewBox="0 0 200 200" role="img" aria-label={`Gráfico de pizza: ${ter} proprietários, ${pctTxt(r.jblPct)} JBL, ${pctTxt(r.infraPct)} obras`}>
                    <g transform="translate(100 100) rotate(-90)">
                      <circle r="70" fill="none" stroke="var(--gold)" strokeWidth="56" strokeDasharray={`${pie[0]} ${circ.toFixed(2)}`} />
                      <circle r="70" fill="none" stroke="var(--sky-strong)" strokeWidth="56" strokeDasharray={`${pie[1]} ${circ.toFixed(2)}`} strokeDashoffset={`-${pie[0]}`} />
                      <circle r="70" fill="none" stroke="var(--line)" strokeWidth="56" strokeDasharray={`${pie[2]} ${circ.toFixed(2)}`} strokeDashoffset={`-${(Number(pie[0]) + Number(pie[1])).toFixed(2)}`} />
                    </g>
                    {[
                      [r.terrenistaPct, 0, "var(--navy)"],
                      [Math.max(r.jblPct, 0), r.terrenistaPct, "#fff"],
                      [r.infraPct, r.terrenistaPct + Math.max(r.jblPct, 0), "var(--navy)"],
                    ].map(([frac, ini, cor], i) => {
                      if ((frac as number) < 0.04) return null;
                      const a = ((ini as number) + (frac as number) / 2) * 2 * Math.PI;
                      return (
                        <text key={i} x={(100 + 70 * Math.sin(a)).toFixed(1)} y={(100 - 70 * Math.cos(a) + 5).toFixed(1)} textAnchor="middle" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontWeight="700" fontSize="14" fill={cor as string}>
                          {pctTxt(frac as number)}
                        </text>
                      );
                    })}
                    <text x="100" y="96" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="400" fontSize="23" fill="var(--navy)">100%</text>
                    <text x="100" y="116" textAnchor="middle" fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif" fontSize="12" fill="var(--muted)">Total</text>
                  </svg>
                  <div className="shares">
                    <div className="share you"><span className="dot" style={{ background: "var(--gold)" }} /><div><b><D k="sh1">{d.pick("Proprietários (a família)", d.tipo === "proprietario" ? d.rotulo : "Proprietários", "Proprietários")}</D></b><small className="num" style={{ fontWeight: 700, color: "var(--navy)", fontSize: "14.5px" }}><V k="sh1v2" >{`À vista: ${fmtBRL(r.vgvAvistaTer)} · Em ${n} meses: ${fmtBRL(r.principal.carteiraTer)}`}</V></small></div><span className="pct"><V k="sh1p">{ter}</V></span></div>
                    <div className="share-group"><span className="brace" aria-hidden="true" /><span className="brace-lbl">{pctTxt(1 - r.terrenistaPct)}</span>
                      <div className="share"><span className="dot" style={{ background: "var(--sky-strong)" }} /><div><b><T k="sh2">JBL Incorporadora</T></b><small className="num" style={{ fontWeight: 700, color: "var(--navy)", fontSize: "13.2px" }}><V k="sh2v">{`À vista: ${fmtBRL(r.vgvAvista * r.jblPct)}`}</V></small></div><span className="pct"><V k="sh2p">{pctTxt(r.jblPct)}</V></span></div>
                      <div className="share"><span className="dot" style={{ background: "var(--line)" }} /><div><b><T k="sh3">Infraestrutura (obras)</T></b><small className="num" style={{ fontWeight: 700, color: "var(--navy)", fontSize: "13.2px" }}><V k="sh3v">{`À vista: ${fmtBRL(r.custoInfra)}`}</V></small></div><span className="pct"><V k="sh3p">{pctTxt(r.infraPct)}</V></span></div>
                    </div>
                    <div className="share total"><span /><div><b><T k="shTotal">Total</T></b></div><span className="pct">100%</span></div>
                  </div>
                </div>
                <h3 className="vgv-title"><span><D k="vtParte">{d.pick("Parte da família", `Parte ${d.da}`, "Sua parte")}</D></span><em>{ter}</em><i className="vt-sep" aria-hidden="true">|</i><span><T k="vtInc">Incluindo a primeira etapa</T></span></h3>
                <div className="split vgv-split" role="img" aria-label={`Se todos os lotes forem vendidos à vista: ${fmtBRL(r.vgvAvistaTer)}; a prazo em ${n} meses: ${fmtBRL(r.principal.carteiraTer)}`}>
                  <div className="s-lots" style={{ flex: 50 }}><span className="vs-k"><T k="vs1k2" html>{"Se todos os lotes forem vendidos <b>à vista</b>"}</T></span><span className="vs-v num"><V k="vs1v">{fmtBRL(r.vgvAvistaTer)}</V></span></div>
                  <span className="vs-or" aria-hidden="true">ou</span>
                  <div className="s-streets" style={{ flex: 50 }}><span className="vs-k"><T k="vs2k2" html>{`Se todos os lotes forem vendidos <b>a prazo</b> (${n} meses)`}</T></span><span className="vs-v num"><V k="vs2v">{fmtBRL(r.principal.carteiraTer)}</V></span></div>
                  <span className="vs-or vs-or2" aria-hidden="true">ou</span>
                  <div className="s-lotes" style={{ flex: 50 }}><span className="vs-k"><D k="vs3k" html>{`Se ${d.quem} preferir receber <b>em lotes</b>`}</D></span><span className="vs-v num"><V k="vs3v">{`≈ ${fmtNum(r.lotes * r.terrenistaPct)} lotes`}</V></span></div>
                </div>
              </div>
            </Sec>

            {/* 8 */}
            <Sec k="recebimentos" className="step" id="recebimentos">
              <div className="step-head"><div className="badge">8</div><div>
                <h2><D k="s8Titulo">{`Quanto ${d.quem} recebe por mês`}</D></h2>
                <p><D k="s8Sub2" html>{`Os clientes pagam o lote em parcelas, e ${d.pick("a parte da família", `a parte ${d.da}`, "a sua parte")} cai todo mês numa conta compartilhada com a JBL. Escolha um prazo para ver <strong>(considerando 100% dos lotes vendidos)</strong>:`}</D></p>
              </div></div>
              <div className="content">
                <div className="tabs" role="group" aria-label="Prazo de pagamento dos clientes">
                  {r.cenarios.map((c, i) => (
                    <button key={c.meses} type="button" className="tab" aria-pressed={i === pick} onClick={() => setPick(i)}>{fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos</button>
                  ))}
                </div>
                <div className="tiles four tiles-sim">
                  <div className="tile"><div className="k"><T k="simK1">Parcela do cliente</T></div><div className="v num">{fmtBRL(sim.parcela)}</div><div className="d"><T k="simD1">por mês, por lote, pagando em dia</T></div></div>
                  <div className="tile gold"><div className="k"><D k="simK2">{d.pick("Família no 1º ano", `${d.rotulo} no 1º ano`, "Você no 1º ano")}</D></div><div className="v num">{fmtBRL0(sim.mensalTer)}</div><div className="d"><T k="simD2">por mês, nos primeiros 12 meses</T></div></div>
                  <div className="tile gold"><div className="k"><D k="simK3">{d.pick("Família última parcela", `${d.rotulo} última parcela`, "Sua última parcela")}</D></div><div className="v num">{fmtBRL0(sim.mensalTerFinal)}</div><div className="d"><T k="simD3b">por mês, no último ano</T></div></div>
                  <div className="tile gold"><div className="k"><D k="simK4">{d.pick("Total carteira da família", `Total carteira ${d.da}`, "Sua carteira total")}</D></div><div className="v num">{mi(sim.carteiraTer)}</div><div className="d">em {sim.meses} meses</div></div>
                </div>
                <div className="bars" aria-label="Total recebido em cada prazo">
                  {r.cenarios.map((c, i) => (
                    <div key={c.meses} className={`bar ${i === pick ? "on" : ""}`} onClick={() => setPick(i)}>
                      <span>{fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos</span>
                      <div className="track"><div className="fill" style={{ width: `${((c.carteiraTer / maxTot) * 100).toFixed(1)}%` }} /></div>
                      <span className="val num">{mi(c.carteiraTer)}</span>
                    </div>
                  ))}
                </div>
                <p className="tip"><T k="s8Tip" html>{"<strong>Regra simples:</strong> prazo curto = mais dinheiro por mês, menos no total. Prazo longo = menos por mês, mas bem mais no total. A parcela recebida também cresce com o tempo, por causa da correção. Cada prazo é uma alternativa: as linhas não se somam."}</T></p>

                <h3><T k="s8h3">A tabela completa</T></h3>
                <div className="tbl tbl-pay"><table>
                  <thead><tr>
                    <th>Prazo de venda</th>
                    <th>Parcela do comprador<br />com desconto por pontualidade</th>
                    <th>Proprietário por mês<br />primeiros 12 meses¹</th>
                    <th>Proprietário<br />última parcela</th>
                    <th>Total Proprietário<br />Arrecadação final (VGV)</th>
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td data-label="Prazo de venda"><T k="tbAvista">À vista</T></td>
                      <td data-label="Parcela do comprador">Não se aplica</td>
                      <td data-label="Proprietário por mês">Não se aplica</td>
                      <td data-label="Proprietário">Não se aplica</td>
                      <td data-label="Total Proprietário"><E fixo k="t.avista">{fmtBRL(r.vgvAvistaTer)}</E></td>
                    </tr>
                    {r.cenarios.map((c) => (
                      <tr key={c.meses} className={c.meses === n ? "you" : ""}>
                        <td data-label="Prazo de venda"><E fixo k={`t.${c.meses}.prazo`}>{`${fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos · ${c.meses} parcelas`}</E></td>
                        <td data-label="Parcela do comprador"><E fixo k={`t.${c.meses}.parcela`}>{fmtBRL(c.parcela)}</E></td>
                        <td data-label="Proprietário por mês"><E fixo k={`t.${c.meses}.mensal`}>{fmtBRL(c.mensalTer)}</E></td>
                        <td data-label="Proprietário"><E fixo k={`t.${c.meses}.final`}>{fmtBRL(c.mensalTerFinal)}</E></td>
                        <td data-label="Total Proprietário"><E fixo k={`t.${c.meses}.total`}>{fmtBRL(c.carteiraTer)}</E></td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div className="note">
                  <p><T k="s8n1">{`¹ Considerando 100% das unidades vendidas. ² Participação do terrenista de ${terN}%. Parcela do comprador = ${fmtBRL0(r.saldoPrazo)} ÷ número de meses (saldo de ${fmtBRL0(r.valorLote - r.entrada)} × ${fmtNum(inputs.multiplicador, 2)}). As parcelas sobem ${reaj} a cada 12 meses; o total final é a soma de todas as parcelas recebidas.`}</T></p>
                  <p><T k="s8n2">Venda à vista: sem desconto de comissão. As parcelas dos clientes consideram desconto por pagamento em dia.</T></p>
                </div>
                <div className="cards">
                  <div className="card"><b><T k="rbT">Receita bruta</T></b><p><T k="rb">Os valores são brutos, sem descontar a parte proporcional de impostos, contabilidade, despesas bancárias (taxas e boletos), notificações (AR, extrajudiciais/judiciais) e distratos, quando for o caso.</T></p></div>
                  <div className="card"><b><T k="caucaoT">Caução municipal de 20%</T></b><p><T k="caucao">As contas não consideram a caução de 20% das unidades de lotes que o município pode exigir, quando houver.</T></p></div>
                </div>
              </div>
            </Sec>

            {/* 9 */}
            <Sec k="antecipacao" className="step" id="antecipacao">
              <div className="step-head"><div className="badge">9</div><div>
                <h2><D k="s9Titulo">{`E se ${d.quem} quiser o dinheiro antes?`}</D></h2>
                <p><T k="s9Sub2">É possível vender as parcelas futuras, trazendo esses valores para o presente. Isso se chama antecipação de recebíveis.</T></p>
              </div></div>
              <div className="content">
                <p><T k="s9p1">Parceiros terrenistas, intermediadores e prestadores vinculados à SPE ou SCP podem antecipar recebíveis por meio da JBL, quando disponível, ou de parceiros especializados. A operação depende de aprovação, acontece depois do TVO (Termo de Verificação de Obras, ou seja, com as obras prontas) e leva em média 30 dias.</T></p>
                <div className="calc num">
                  <span className="n">=</span><span className="t"><T k="s9CalcT">A conta</T></span>
                  <span className="f"><span><V k="s9a">{fmtBRL(r.antecipacao.carteira)}</V></span><small><T k="s9as">carteira</T></small><span className="op">−</span><span><V k="s9b">{fmtPct(inputs.desagio, 3)}</V></span><small><T k="s9bs">deságio médio</T></small><span className="op">=</span><span className="res" id="v8"><V k="s9r">{fmtBRL(r.antecipacao.valor)}</V></span></span>
                </div>
                <p><T k="s9p2b">Em palavras simples: bancos ou empresas especializadas compram os boletos futuros dos clientes e pagam à vista, com desconto. Antes, as obras precisam estar verificadas e a operação aprovada.</T></p>
                <div className="review"><b><T k="s9rT">O que ainda depende de confirmação</T></b><ul>
                  {["Saldo da carteira no momento da antecipação", "Parcelas que já tiverem sido recebidas", "Qualidade dos contratos e inadimplência", "Taxas cobradas na época", "Disponibilidade de compradores para a carteira"].map((x, i) => <li key={i}><T k={`s9r${i}`}>{x}</T></li>)}
                </ul></div>
                <h3><D k="s9h3">{`E se ${d.quem} aplicar esse dinheiro no banco?`}</D></h3>
                <p><T k="s9p3">{`A JBL fez uma simulação: aplicar o valor recebido num banco tradicional a ${fmtPct(inputs.taxaAplicacao)} ao mês, comparando com a carteira de ${anos} anos. A JBL oferece assessoria para essa aplicação, sem custo.`}</T></p>
                <div className="tbl tbl-pay tbl-bank"><table>
                  <thead><tr><th><T k="s9th1">Indicador da simulação</T></th><th className="r"><T k="s9th2">Valor informado</T></th></tr></thead>
                  <tbody>
                    <tr><td data-label="Indicador da simulação"><T k="s9l1">{`Aplicação a ${fmtPct(inputs.taxaAplicacao)}: juros no primeiro mês`}</T></td><td data-label="Valor informado" className="r"><V k="s9v1">{fmtBRL(r.antecipacao.jurosMes1)}</V></td></tr>
                    <tr><td data-label="Indicador da simulação"><T k="s9l2">{`Aplicação a ${fmtPct(inputs.taxaAplicacao)} composto: última parcela base (${anos} anos)`}</T></td><td data-label="Valor informado" className="r"><V k="s9v2">{fmtBRL(r.antecipacao.ultimaBase)}</V></td></tr>
                    <tr><td data-label="Indicador da simulação"><T k="s9l3">Multiplicador de rentabilidade final</T></td><td data-label="Valor informado" className="r"><V k="s9v3">{`${fmtNum(r.antecipacao.multiplicador, 4)} vezes`}</V></td></tr>
                    <tr className="you"><td data-label="Indicador da simulação"><strong><T k="s9l4">Rentabilidade final</T></strong></td><td data-label="Valor informado" className="r"><span className="rb-wrap"><strong className="rb-val"><V k="s9v4">{fmtBRL(r.antecipacao.rentabilidade)}</V></strong><span className="rb-ext"><V k="s9v4ext">{ext(r.antecipacao.rentabilidade)}</V></span></span></td></tr>
                  </tbody>
                </table></div>
                <p className="note"><T k="s9Nota">Base: desconto de 6% de comissão e marketing, sem incluir lotes já vendidos à vista até a securitização. Maior prazo de venda parcelada pode ampliar o valor presente, conforme as condições da operação. Transação após o TVO e entrega das obras. Simulação sujeita à confirmação das taxas e condições antes da contratação.</T></p>
                <div className="review"><b><T k="s9oT">Observação</T></b><ul><li><T k="s9o2">Essa simulação é uma aplicação financeira, não receita do loteamento.</T></li></ul></div>
              </div>
            </Sec>

            {/* 10 */}
            <Sec k="vendas" className="step" id="vendas">
              <div className="step-head"><div className="badge">10</div><div>
                <h2><T k="s10Titulo2">Previsão de Vendas Mensal</T></h2>
                <p><T k="s10Sub">Distribuição mensal estimada, em números inteiros para planejamento:</T></p>
              </div></div>
              <div className="content">
                <div className="sales">
                  <div className="tile gold"><div className="k"><T k="vd1k">1º mês · 45%</T></div><div className="v num"><V k="vd1">{`${r.vendas.mes1} lotes`}</V></div><div className="d"><T k="vd1d">Aproximadamente 45% do total</T></div></div>
                  <div className="tile gold"><div className="k"><T k="vd2k">2º mês · 35%</T></div><div className="v num"><V k="vd2">{`${r.vendas.mes2} lotes`}</V></div><div className="d"><T k="vd2d">Aproximadamente 35% do total</T></div></div>
                  <div className="tile gold"><div className="k"><T k="vd3k">3º mês · 20%</T></div><div className="v num"><V k="vd3">{`${r.vendas.mes3} lotes`}</V></div><div className="d"><T k="vd3d">Aproximadamente 20% do total</T></div></div>
                </div>
                <p className="tip num"><T k="vdTip2" html>{`${r.vendas.mes1} + ${r.vendas.mes2} + ${r.vendas.mes3} = <strong>${r.vendas.total} lotes</strong>. O total estimado de ${lotes2} foi arredondado para ${r.vendas.total} lotes; os percentuais são aproximados e o número definitivo depende do projeto aprovado. Sem considerar a caução de 20% de lotes pelo município, quando houver.`}</T></p>
              </div>
            </Sec>

            {/* 11 */}
            <Sec k="regras" className="step" id="regras">
              <div className="step-head"><div className="badge">11</div><div>
                <h2><T k="s11Titulo">Regras, responsabilidades e garantias</T></h2>
                <p><T k="s11Sub">Os combinados da parceria, explicados um a um.</T></p>
              </div></div>
              <div className="content faq">
                <div><b><T k="rg1t">Quem paga os impostos</T></b><p><T k="rg1">Os parceiros ficarão responsáveis, na proporção de suas respectivas percentagens, pelo pagamento dos tributos gerados relativos às vendas a terceiros das unidades de lotes, assumindo a tributação na parte que lhes cabe no rateio das receitas, nos termos do Parecer Normativo CST n.º 15, de 23/07/1984.</T></p></div>
                <div><b><T k="rg2t">Com o que cada um entra</T></b><p><T k="rg2">Caberá aos parceiros a proporção do valor apurado com a venda dos lotes disponíveis: o parceiro proprietário concorre exclusivamente com a gleba de sua propriedade e a parceira incorporadora concorre integralmente com os recursos financeiros para infraestrutura e demais diligências para a efetiva implantação do empreendimento.</T></p></div>
                <div><b><T k="rg3t">Os números podem variar (desvio padrão)</T></b><p><T k="rg3" html>{"Após os estudos de viabilidade efetivamente concluídos e aprovações das etapas nos órgãos competentes, estatisticamente há a possibilidade de um desvio padrão de <strong>14,66% para mais ou para menos</strong> nos valores informados, bem como na quantidade de unidades de lotes apresentadas."}</T></p><p><T k="rg3d">Observação: o documento não apresenta a base estatística desse percentual.</T></p></div>
                <div><b><T k="rg4t">Custos que não saem das tabelas</T></b><p><T k="rg4">Impostos, contabilidade, taxas bancárias, cobrança e distratos não estão descontados das tabelas de recebimento.</T></p></div>
                <div><b><T k="rg5t">Acompanhamento</T></b><p><T k="rg5">Aplicativo com relatórios, fotos e vídeos a cada 15 dias, além da gestão de boletos e da carteira de recebíveis.</T></p></div>
                <div><b><T k="rg6t">Data e validade</T></b><p><T k="rg6">{options.semValidade ? `Proposta datada de ${dataCurta}. Os números podem precisar de revalidação comercial antes de seguir.` : `Proposta datada de ${dataCurta}, válida por ${options.validadeDias} dias corridos, com possível prorrogação de mais 7 dias. Por isso, ela precisa de revalidação comercial antes de seguir.`}</T></p></div>
              </div>
              <div className="content" style={{ marginTop: 28 }}>
                <h3><T k="premH3">Premissas do projeto</T></h3>
                <div className="cards">
                  {PREMISSAS.map(([t, dsc], i) => (
                    <div key={i} className="card" style={i === PREMISSAS.length - 1 ? { gridColumn: "1/-1" } : undefined}><b><T k={`pr${i}t`}>{t}</T></b><p><T k={`pr${i}`}>{dsc}</T></p></div>
                  ))}
                </div>
              </div>
              <div className="content faq" style={{ marginTop: 28 }}>
                <h3><T k="formH3">Como a parceria é formalizada</T></h3>
                <div><b><T k="fm1t">Constituição da parceria (SPE)</T></b><p><T k="fm1a">Em palavras simples: cria-se uma empresa só para este loteamento, e o terreno passa a fazer parte dela, com registro em cartório.</T></p><p><T k="fm1b">Texto da proposta: promover a constituição de uma empresa SPE - LTDA, integralizar o imóvel e averbá-lo ao Cartório de Registro de Imóveis da Circunscrição da Comarca do Município/UF, objeto da parceria, o empreendimento imobiliário Loteamento Aberto, Fechado Urbano e/ou Condomínio de Lotes/Parcelamento do Solo Urbano, conforme estudo de massa realizado preliminarmente pelo parceiro incorporador, nos termos das Leis 6.766/79, 13.465/2017 e demais legislações aplicáveis, inclusive a lei e os regimes tributários pertinentes (Parecer da Secretaria da Receita Federal - CTS n.º 15/1984), dentro das normas fiscais e contábeis vigentes.</T></p></div>
                <div><b><T k="fm2t">Considerações (SCP)</T></b><p><T k="fm2">Havendo cotistas, as condições relativas aos ganhos, resultados e distribuição de lucros serão contempladas e formalizadas na pactuação da SCP - Sociedade em Conta de Participação.</T></p></div>
                <div><b><T k="fm3t">O compromisso da JBL</T></b><p><T k="fm3">O Grupo JBL tem plena ciência de suas responsabilidades e do compromisso assumido ao lançar seus produtos no mercado, reconhecendo que sua atuação está diretamente associada à reputação, à credibilidade e aos interesses de todos os envolvidos no empreendimento, incluindo terrenistas, adquirentes, parceiros, corretores e prestadores de serviços.</T></p></div>
              </div>
            </Sec>

            {/* 12 */}
            <Sec k="aviso" className="step" id="aviso-legal">
              <div className="step-head"><div className="badge">12</div><div>
                <h2><T k="s12Titulo">Aviso legal</T></h2>
                <p><T k="s12Sub2">{options.semValidade ? "Em resumo: a proposta é confidencial e os números ainda serão confirmados pela JBL." : `Em resumo: a proposta é confidencial, vale por ${options.validadeDias} dias, podendo ser prorrogada por mais 7 dias, e os números ainda serão confirmados pela JBL.`}</T></p>
              </div></div>
              <div className="content faq">
                <div>
                  <p><T k="al1">O presente instrumento foi elaborado pela JBL Incorporadora e Urbanismo e destinado exclusivamente ao destinatário. É originalmente confidencial e restrito aos envolvidos e não constitui instrumento promocional.</T></p>
                  {!options.semValidade && <p><T k="al2b2" html>{`<strong>A validade desta proposta é de ${options.validadeDias} dias corridos.</strong> O destinatário poderá partilhar com a JBL manifestações concernentes a este instrumento dentro deste prazo ou <strong>solicitar prorrogação por mais 7 dias corridos</strong>. Após esses prazos, entrará na expectação para a realização da análise de viabilidade.`}</T></p>}
                  <p><T k="al3">Este material contém informações, estimativas e projeções revisadas por terceiros ou obtidas de fontes públicas, as quais ainda não foram verificadas pela JBL. Essas informações, estimativas e projeções estão sujeitas a mudanças.</T></p>
                  <p><T k="al4">No avanço das negociações, a JBL se incumbirá de aplicar sua própria investigação e proceder às ações relacionadas ao objeto deste instrumento.</T></p>
                  <p><T k="al5b" html>{"<strong>Todas as informações devem ser mantidas de forma estritamente confidencial aos envolvidos e somente podem ser divulgadas, no todo ou em parte, com prévia e expressa anuência da JBL, e somente para pessoas que tenham trato confidencial das informações.</strong>"}</T></p>
                </div>
              </div>
            </Sec>
          </main>

          <Sec k="fim" as="footer" className="end">
            <div className="wrap">
              <h2><T k="fimTitulo">Próximos passos</T></h2>
              <p className="lead"><T k="fimLead">{`Estamos convictos de que a incorporação do ${formato.curto.toLowerCase()} na gleba ${gleba} representa uma oportunidade estratégica que seguramente beneficiará ambas as partes. Aguardamos a oportunidade de discutir esta proposta em maior detalhe.`}</T></p>
              <div className="next">
                <div><b><T k="nx1t">1. Conversar</T></b><T k="nx1">Marcamos uma reunião para tirar todas as dúvidas.</T></div>
                <div><b><T k="nx2t">2. Estudar</T></b><T k="nx2b" html>{"Após a assinatura da carta de intenção entre as partes, a JBL fará o estudo de viabilidade completo da área, <em>in loco</em>."}</T></div>
                <div><b><T k="nx3t">3. Formalizar</T></b><T k="nx3">Se tudo der certo, criamos a empresa da parceria e começamos o projeto.</T></div>
              </div>
              <div className="brokers">
                <b><T k="brT2">Contatos exclusivos</T></b><br />
                <ListaContatos base={formato.contatos} padrao={{ nome: options.corretorNome, telefone: options.corretorTelefone }} />
              </div>
              {!options.cartaIntencao && fecho}
              <div className="dl-foot">
                <Lnk k="pdfBottom" href="#pdf" className="dl dl-gold js-pdf" onDefault={abrirPdf}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 19h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <T k="pdfBottom">Baixar proposta completa em PDF</T>
                </Lnk>
                <span>
                  {gerando ? (
                    <>Gerando o PDF da proposta…</>
                  ) : pdfPages ? (
                    <>Esta proposta completa contém <strong>{pdfPages} páginas</strong>, em PDF tamanho A4</>
                  ) : (
                    <>Esta proposta completa, em PDF tamanho A4</>
                  )}
                </span>
              </div>
            </div>
          </Sec>

          {options.cartaIntencao && (
            <Sec k="intent" className="intent" id="intencao">
              <div className="wrap">
                <div className="eyebrow"><T k="intentEyebrow2">Vamos avançar na análise</T></div>
                <h2 style={{ fontSize: "clamp(28px,4.5vw,40px)", marginTop: 6 }}><T k="intentTitulo2">Carta de intenção. Comece por aqui.</T></h2>
                <p className="muted" style={{ marginTop: 8, maxWidth: "64ch" }}><T k="intentTexto2" html>{'Preencha os campos e a carta ao lado se monta sozinha. Ao enviar, você registra o interesse em continuar os estudos e a elaboração da carta de intenção. Isso <strong>não</strong> transfere o imóvel, não substitui a assinatura de contrato e não garante os valores projetados. Campos com <span class="req">*</span> são obrigatórios.'}</T></p>
                <IntentForm token={props.token} disabled={mode !== "public"} project={project} areaHa={ha} />
                {fecho}
              </div>
            </Sec>
          )}

          <Sec k="rodape" as="footer" className="dark-foot">
            <div className="wrap df-grid">
              <div className="df-brand">
                <Img k="logoRodape" src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" />
                <div className="df-social">
                  {SOCIAIS.map(([href, nome, icone]) => (
                    <Lnk key={nome} k={`social${nome}`} href={href} aria-label={`${nome} da JBL`}>{icone}</Lnk>
                  ))}
                </div>
              </div>
              <div className="df-col">
                <h4><T k="dfA">A proposta</T></h4>
                <Lnk k="dfA1" href="#carta"><Chevron /><D k="dfA1">{d.pick("Carta à família", `Carta ${d.tipo === "proprietario" ? (options.destinatario?.genero === "f" ? "à proprietária" : "ao proprietário") : ""}`, `Carta a ${d.nome}`)}</D></Lnk>
                {[["#participacao", "dfA2", "Sua participação"], ["#recebimentos", "dfA3", "Recebimentos"], ["#execucao", "dfA4", "Execução"]].map(([h, k, l]) => (
                  <Lnk key={k} k={k} href={h}><Chevron /><T k={k}>{l}</T></Lnk>
                ))}
                <Lnk k="dfPdf" href="#pdf" onDefault={abrirPdf}><Chevron /><T k="dfPdf">Baixar proposta em PDF</T></Lnk>
              </div>
              <div className="df-col">
                <h4><T k="dfB">Responsável</T></h4>
                <span className="df-strong"><T k="dfB1">Marcelo Aguilar</T></span>
                <span><T k="dfB2">Diretor de Expansão</T></span>
                <span className="df-ic"><Phone /><span className="sel"><T k="dfB3">(11) 94009-1744</T></span></span>
              </div>
              <div className="df-col">
                <h4><T k="dfC">Contato</T></h4>
                <span className="df-ic"><Phone /><span className="sel"><T k="dfC1">(11) 2110-2731</T></span></span>
                <span className="df-ic"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3 6l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="2" /></svg><Lnk k="dfMail" href={`mailto:contato@jblincorporadora.com.br?subject=${encodeURIComponent(`Proposta ${gleba}`)}`} className="df-mail"><T k="dfC2">contato@jblincorporadora.com.br</T></Lnk></span>
                <span className="df-ic"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" fill="currentColor" /></svg><span><T k="dfC3" multiline>{"Alameda Rio Negro, n.º 503, Cj. 2011\n20º andar – Alphaville Empresarial\nBarueri/SP"}</T></span></span>
              </div>
            </div>
            <div className="df-bottom"><div className="wrap">
              <span><T k="dfBot1">{`Proposta ${gleba} · ${local}`}</T></span>
              <span><T k="dfBot2">{`Base: documento de ${data}. Projeções sujeitas a revisão, viabilidade e contratação.`}</T></span>
            </div></div>
          </Sec>
        </div>
      </ThemeRoot>
    </EditProvider>
  );
}
