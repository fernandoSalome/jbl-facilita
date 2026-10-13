"use client";

import "./jbl-padrao.css";
import { useEffect, useMemo, useState } from "react";
import { calcular, type StudyInputs } from "@/lib/calc";
import { fmtBRL, fmtBRL0, fmtLongDate, fmtM2, fmtNum, fmtPct } from "@/lib/format";
import type { Overrides, ProposalOptions } from "@/lib/proposals";
import { E, EditProvider } from "./Editable";
import IntentForm from "./IntentForm";
import Tracker from "./Tracker";

export type TemplateProps = {
  project: { name: string; tipo: string; municipio: string; uf: string; matricula: string | null; aerialImage: string | null };
  ownerName: string;
  inputs: StudyInputs;
  options: ProposalOptions;
  overrides: Overrides;
  date: string;
  token: string;
  mode: "public" | "edit" | "preview";
  onSave?: (k: string, v: string | null) => Promise<void>;
};

const WHATSAPP_MARCELO = "5511940091744";

/** Texto fixo do template, editável no portal. Chave "txt.<k>". */
function T({ k, children, multiline }: { k: string; children: string; multiline?: boolean }) {
  return <E k={`txt.${k}`} multiline={multiline}>{children}</E>;
}

/** Valor calculado, editável no portal. Chave "v.<k>". */
function V({ k, children }: { k: string; children: string }) {
  return <E k={`v.${k}`}>{children}</E>;
}

function Pie({ parts }: { parts: { pct: number; color: string }[] }) {
  let acc = 0;
  const R = 15.9155;
  return (
    <svg viewBox="0 0 42 42" style={{ width: "100%", maxWidth: 240 }} aria-hidden>
      <circle cx="21" cy="21" r={R} fill="none" stroke="#DDE3E9" strokeWidth="7" />
      {parts.map((p, i) => {
        const v = Math.max(p.pct, 0) * 100;
        const el = <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={p.color} strokeWidth="7" strokeDasharray={`${v} ${100 - v}`} strokeDashoffset={25 - acc} />;
        acc += v;
        return el;
      })}
    </svg>
  );
}

const OBRAS = ["Topografia e terraplenagem", "Abertura de ruas", "Rede de esgoto", "Rede de água", "Drenagem pluvial", "Rede elétrica", "Asfalto (CBUQ)", "Guias e sarjetas", "Calçadas", "Árvore em frente a cada lote", "Paisagismo"];
const CRONOGRAMA: [string, number][] = [["Drenagem e esgoto", 0], ["Água", 1], ["Elétrica", 2], ["Pavimentação", 3]];

export default function JblPadrao(props: TemplateProps) {
  const { project, inputs, options, mode } = props;
  const r = useMemo(() => calcular(inputs), [inputs]);
  const [scroll, setScroll] = useState(0);
  const ha = inputs.areaTotal / 10000;
  const anosTxt = fmtNum(r.nParcelas / 12, 0);
  const gleba = project.name;
  const cidade = `${project.municipio} - ${project.uf}`;
  const editing = mode === "edit";

  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setScroll((h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1)) * 100);
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const ctaHref = options.cartaIntencao
    ? "#carta-intencao"
    : `https://wa.me/${WHATSAPP_MARCELO}?text=${encodeURIComponent(`Olá! Recebi a proposta da gleba ${gleba} e gostaria de conversar.`)}`;
  // No modo edição os links não navegam: o clique serve para editar o texto
  const go = (e: React.MouseEvent) => editing && e.preventDefault();

  return (
    <EditProvider overrides={props.overrides} editable={editing} onSave={props.onSave}>
      <div className={`jblt ${editing ? "editing" : ""} ${mode !== "public" ? "embedded" : ""}`}>
        {mode === "public" && <Tracker token={props.token} />}

        <header className="nav">
          <div className="wrap">
            <a href="#topo" onClick={go} aria-label="JBL Incorporadora e Urbanismo">
              <img className="lockup" src="/brand/lockup.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" />
            </a>
            <nav className="links">
              <a href="#participacao" onClick={go}><T k="menu1">Sua participação</T></a>
              <a href="#recebimentos" onClick={go}><T k="menu2">Recebimentos</T></a>
              <a href="#execucao" onClick={go}><T k="menu3">Execução</T></a>
            </nav>
            <a className="cta-gold" href={ctaHref} onClick={go} target={ctaHref.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              {options.cartaIntencao ? <T k="ctaCarta">Carta de intenção ↓</T> : <T k="ctaFalar">Falar com a JBL</T>}
            </a>
          </div>
          <div className="progress" style={{ width: `${scroll}%` }} />
        </header>

        {/* CAPA */}
        <div className="wrap" id="topo">
          <div className="cover-meta">
            <span><T k="capaMeta">Proposta de parceria · Confidencial</T></span>
            <span><T k="capaData">{`São Paulo, ${fmtLongDate(props.date)}`}</T></span>
          </div>
          <div className="hero">
            <div>
              <div className="eyebrow"><T k="capaEyebrow">Proposta de parceria</T></div>
              <h1>
                <T k="capaTitulo">{gleba}</T>
                <em><T k="capaSubtitulo">{`${project.tipo} em ${project.municipio}`}</T></em>
              </h1>
            </div>
            <div className="hero-right">
              <p>
                <T k="hero">A família entra com a terra. A JBL entra com os projetos, as obras e as vendas. O resultado é dividido entre os parceiros, em dinheiro, em lotes ou nos dois.</T>
              </p>
              <div className="chips">
                <span className="chip"><T k="chip1">{project.tipo}</T></span>
                <span className="chip"><T k="chip2">{cidade}</T></span>
                {project.matricula && <span className="chip"><T k="chip3">{`Matrícula ${project.matricula}`}</T></span>}
              </div>
              <a className="ghost" href="#participacao" onClick={go}><T k="capaBotao">Ver como funciona</T></a>
            </div>
          </div>
          {project.aerialImage && (
            <figure className="photo">
              <img src={project.aerialImage} alt={`Vista aérea da gleba ${gleba}`} />
              <figcaption>
                <span><T k="fotoLegenda">{`Gleba ${gleba} · ${fmtNum(ha, 4)} hectares`}</T></span>
                <small><T k="fotoNota">Imagem fornecida para a proposta. Demarcação indicativa; limites sujeitos à documentação técnica.</T></small>
              </figcaption>
            </figure>
          )}
          <div className="hero-stats">
            <div><b><V k="areaTotal">{fmtM2(inputs.areaTotal)}</V></b><span><T k="stat1">área total indicada</T></span></div>
            <div><b><V k="areaUtil">{fmtM2(r.areaUtil)}</V></b><span><T k="stat2">{`área aproveitável estimada (${fmtPct(inputs.aproveitamento)} da área total)`}</T></span></div>
            <div><b><V k="metragem">{fmtM2(inputs.metragemLote, 0)}</V></b><span><T k="stat3">{`lotes de ${fmtNum(inputs.frenteLote, 0)} × ${fmtNum(r.fundoLote, 0)} metros`}</T></span></div>
            <div><b><V k="matricula">{project.matricula ?? "—"}</V></b><span><T k="stat4">matrícula do imóvel</T></span></div>
          </div>
          <div className="quote">
            <blockquote>
              <T k="frase">“O empreendimento mais importante para nós é o realizado!”</T>
              <small><T k="fraseAutor">Marcelo Aguilar · Diretor de Expansão</T></small>
            </blockquote>
            <div className="tech">
              <T k="tecnicos" multiline>{"Eng.º Felipe Stampini Oliveira Lopes · CREA 248492/D\nArquiteto Fábio Barros Belizário · CAU A117931-4"}</T>
            </div>
          </div>

          {/* CARTA */}
          <article className="letter">
            <div className="letterhead">
              <div className="eyebrow"><T k="cartaEyebrow">Uma parceria para realizar</T></div>
              <img src="/brand/logo-vertical.webp" alt="" />
            </div>
            <h2><T k="saudacao">{`Prezada ${props.ownerName.toLowerCase().startsWith("família") ? props.ownerName : "Família"},`}</T></h2>
            <p><T k="carta1">{`Recebam nosso abraço e nosso agradecimento pela oportunidade de conhecer a história e o potencial da gleba ${gleba}. Sabemos que uma área carrega o trabalho, os planos e o cuidado de uma família. É com respeito por essa trajetória que apresentamos nossa Proposta Técnica e Comercial de parceria para o parcelamento do solo sob o modelo de ${project.tipo} (Lei Federal n.º 6.766/79), para vossa análise e apreciação. A proposta refere-se à gleba ${gleba}, com área total de ${fmtM2(inputs.areaTotal)}, localizada em ${cidade}.`}</T></p>
            <p><T k="carta2">A JBL Incorporadora e Urbanismo é uma empresa especializada em loteamentos e urbanização, com ampla experiência de mercado e profissionais altamente qualificados. Cada novo projeto reúne especialistas em arquitetura, engenharia, ciências biológicas, geologia, direito, administração, contabilidade, perícia de avaliação, topografia, comercial e marketing, viabilizando empreendimentos desde o padrão econômico até o de alto padrão.</T></p>
            <p><T k="carta3">Nas próximas páginas, compartilhamos as atividades e os números deste projeto, para que vocês possam avaliar a parceria com tranquilidade e clareza. Queremos construir essa decisão juntos, ouvindo suas expectativas e esclarecendo cada dúvida. Nossa estrutura física, equipe capacitada e experiência estão à disposição da família. Será um prazer recebê-los para uma conversa e agendar uma reunião.</T></p>
            <p className="sign"><T k="assinatura" multiline>{"Atenciosamente,\nMarcelo Aguilar"}</T><small><T k="assinaturaCargo">Diretor de Expansão</T></small></p>
          </article>

          <div className="big-idea">
            <div className="eyebrow"><T k="ideiaEyebrow">A ideia em uma frase</T></div>
            <h2><T k="ideia">Vocês entram com o terreno. A JBL entra com o dinheiro e o trabalho. O que for vendido é dividido.</T></h2>
            <div className="tiles" style={{ marginTop: 22 }}>
              <div className="tile"><h3><T k="ideia1t">A família</T></h3><p><T k="ideia1">Entra com a terra. Não coloca dinheiro nas obras de infraestrutura previstas.</T></p></div>
              <div className="tile"><h3><T k="ideia2t">A JBL</T></h3><p><T k="ideia2">Cuida dos estudos, aprovações, infraestrutura, marketing, vendas e da carteira de recebíveis.</T></p></div>
              <div className="tile"><h3><T k="ideia3t">Os parceiros</T></h3><p><T k="ideia3">Dividem o resultado. A família escolhe receber em dinheiro, em lotes ou numa mistura dos dois.</T></p></div>
            </div>
          </div>

          <div className="part"><T k="parte">Os números do seu terreno</T></div>

          {/* 1. TERRENO */}
          <section className="step" id="terreno">
            <div className="step-head"><div className="badge">1</div><div>
              <h2><T k="s1Titulo">O tamanho do terreno</T></h2>
              <p><T k="s1Sub">Nem todo o terreno vira lote. Uma parte precisa virar rua, calçada e área verde, como em qualquer bairro.</T></p>
            </div></div>
            <div className="content">
              <div className="tiles">
                <div className="tile"><div className="k"><T k="s1k1">Terreno inteiro</T></div><div className="v"><V k="areaTotal2">{fmtM2(inputs.areaTotal)}</V></div><div className="d"><T k="s1d1">{`${fmtNum(ha, 4)} hectares.`}</T></div></div>
                <div className="tile hl"><div className="k"><T k="s1k2">{`Vira lotes (${fmtPct(inputs.aproveitamento)})`}</T></div><div className="v"><V k="areaUtil2">{fmtM2(r.areaUtil)}</V></div><div className="d"><T k="s1d2">{`${fmtNum(r.areaUtil / 10000, 4)} hectares aproveitáveis.`}</T></div></div>
                <div className="tile"><div className="k"><T k="s1k3">Número de lotes</T></div><div className="v"><V k="lotes">{fmtNum(r.lotes, 2)}</V></div><div className="d"><T k="s1d3">{`Estimativa do estudo. Na prática, cerca de ${r.lotesInteiros} a ${r.lotesInteiros + 1} lotes.`}</T></div></div>
              </div>
              <div className="calc">
                <div className="n">=</div>
                <div className="t"><T k="s1CalcT">De onde vem o número de lotes</T></div>
                <div className="f"><span><V k="f1a">{fmtM2(r.areaUtil)}</V></span><span className="op">÷</span><span><V k="f1b">{`${fmtM2(inputs.metragemLote, 0)} por lote`}</V></span><span className="op">=</span><span className="res"><V k="lotesEq">{`${fmtNum(r.lotes, 2)} lotes equivalentes`}</V></span></div>
              </div>
              <p className="note"><T k="s1Nota">“Lotes equivalentes” porque não existe fração de lote: é uma conta para estimar valores. O número exato de lotes depende do projeto aprovado.</T></p>
              <div className="split">
                <div className="s-lots" style={{ width: `${inputs.aproveitamento * 100}%` }}><T k="s1Bar1">Parte vira lotes</T></div>
                <div className="s-streets" style={{ width: `${(1 - inputs.aproveitamento) * 100}%` }}><T k="s1Bar2">Ruas, calçadas, áreas verdes e lazer</T></div>
              </div>
            </div>
          </section>

          {/* 2. OBRAS */}
          <section className="step" id="execucao">
            <div className="step-head"><div className="badge">2</div><div>
              <h2><T k="s2Titulo">Quanto custam as obras, e quem paga</T></h2>
              <p><T k="s2Sub">Toda a infraestrutura é financiada e executada pela JBL.</T></p>
            </div></div>
            <div className="content">
              <div className="pills">
                {OBRAS.map((x, i) => <span key={i}><T k={`obra${i}`}>{x}</T></span>)}
              </div>
              <div className="calc">
                <div className="n">=</div>
                <div className="t"><T k="s2CalcT">Orçamento das obras</T></div>
                <div className="f"><span><V k="f2a">{fmtM2(r.areaUtil)}</V></span><span className="op">×</span><span><V k="f2b">{`${fmtBRL(inputs.custoInfraM2)}/m²`}</V></span><span className="op">=</span><span className="res"><V k="custoInfra">{fmtBRL(r.custoInfra)}</V></span></div>
                <p className="why"><T k="s2Why">O custo resulta da área aproveitável multiplicada pelo valor de infraestrutura por m².</T></p>
              </div>
              <div className="tip good"><b><T k="s2TipT">A JBL financia e executa a infraestrutura.</T></b> <T k="s2Tip">Em nenhuma hipótese será solicitado aos proprietários da área quantias ou valores para execução desses serviços.</T></div>
              <div className="gantt-wrap">
                <div className="gantt">
                  <div className="h" style={{ textAlign: "left" }}><T k="ganttObra">Obra</T></div>
                  {[1, 2, 3, 4].map((a) => <div key={a} className="h"><T k={`ganttAno${a}`}>{`${a}º ano`}</T></div>)}
                  {CRONOGRAMA.map(([l, on], j) => (
                    <div key={j} style={{ display: "contents" }}>
                      <div className="l"><T k={`gantt${j}`}>{l}</T></div>
                      {[0, 1, 2, 3].map((i) => <div key={i} className={`c ${i === on ? "on" : ""}`} />)}
                    </div>
                  ))}
                  <div className="l"><T k="ganttOutros">Outros</T></div>{[0, 1, 2, 3].map((i) => <div key={i} className="c on" style={{ opacity: 0.45 }} />)}
                </div>
              </div>
            </div>
          </section>

          {/* 3. VGV */}
          <section className="step" id="vgv">
            <div className="step-head"><div className="badge">3</div><div>
              <h2><T k="s3Titulo">Quanto vale tudo isso (VGV)</T></h2>
              <p><T k="s3Sub">VGV é o Valor Geral de Vendas: a soma do que os lotes valem quando vendidos.</T></p>
            </div></div>
            <div className="content chain">
              <div className="calc">
                <div className="n">1</div><div className="t"><T k="s3c1">Preço do lote à vista</T></div>
                <div className="f"><span><V k="f3a">{fmtM2(inputs.metragemLote, 0)}</V></span><span className="op">×</span><span><V k="f3b">{`${fmtBRL(inputs.valorM2)} por m²`}</V></span><span className="op">=</span><span className="res"><V k="valorLote">{fmtBRL(r.valorLote)}</V></span></div>
                <p className="why"><T k="s3w1">Preço de mercado estimado a partir de corretores da região e pesquisas.</T></p>
              </div>
              <div className="calc">
                <div className="n">2</div><div className="t"><T k="s3c2">{`Entrada do comprador (${fmtPct(inputs.entradaPct)})`}</T></div>
                <div className="f"><span><V k="f4a">{fmtBRL(r.valorLote)}</V></span><span className="op">×</span><span><V k="f4b">{fmtPct(inputs.entradaPct)}</V></span><span className="op">=</span><span className="res"><V k="entrada">{fmtBRL(r.entrada)}</V></span></div>
              </div>
              <div className="calc">
                <div className="n">3</div><div className="t"><T k="s3c3">{`Parcela do comprador em ${r.nParcelas} meses`}</T></div>
                <div className="f"><span><V k="f5a">{`(${fmtBRL0(r.valorLote)} − ${fmtBRL0(r.entrada)})`}</V></span><span className="op">×</span><span><V k="f5b">{fmtNum(inputs.multiplicador, 2)}</V></span><span className="op">÷</span><span><V k="f5c">{String(r.nParcelas)}</V></span><span className="op">=</span><span className="res"><V k="parcela">{fmtBRL(r.parcela)}</V></span></div>
                <p className="why"><T k="s3w3">{`O multiplicador de ${fmtNum(inputs.multiplicador, 2)} incorpora os juros do financiamento próprio. A parcela é reajustada uma vez por ano em ${fmtPct(r.reajuste)} (IPCA + juros).`}</T></p>
              </div>
              <div className="calc">
                <div className="n">4</div><div className="t"><T k="s3c4">VGV total à vista</T></div>
                <div className="f"><span><V k="f6a">{`${fmtNum(r.lotes, 2)} lotes`}</V></span><span className="op">×</span><span><V k="f6b">{fmtBRL0(r.valorLote)}</V></span><span className="op">=</span><span className="res"><V k="vgvAvista">{fmtBRL(r.vgvAvista)}</V></span></div>
              </div>
              <div className="calc">
                <div className="n">5</div><div className="t"><T k="s3c5">{`VGV global projetado em ${r.nParcelas} meses`}</T></div>
                <div className="f"><span><T k="s3f5">{`Carteira com reajuste de ${fmtPct(r.reajuste)} ao ano`}</T></span><span className="op">=</span><span className="res big"><V k="vgvGlobal">{fmtBRL(r.principal.carteiraEmp)}</V></span></div>
                <p className="why"><T k="s3w5">{`Soma de todas as parcelas que os compradores pagam em ${anosTxt} anos, já com o reajuste anual, considerando 100% dos lotes vendidos.`}</T></p>
              </div>
            </div>
          </section>

          {/* 4. DIVISÃO */}
          <section className="step" id="participacao">
            <div className="step-head"><div className="badge">4</div><div>
              <h2><T k="s4Titulo">Como o dinheiro é dividido</T></h2>
              <p><T k="s4Sub">Participação de cada parte sobre o VGV.</T></p>
            </div></div>
            <div className="content">
              <div className="pie-row">
                <Pie parts={[{ pct: r.terrenistaPct, color: "#C1943D" }, { pct: r.jblPct, color: "#122A45" }, { pct: r.infraPct, color: "#C9D3DE" }]} />
                <div className="shares">
                  <div className="share you">
                    <span className="dot" style={{ background: "#C1943D" }} />
                    <div><b><T k="s4p1">Proprietários</T></b><small><T k="s4p1a">À vista:</T> <V k="terAvista">{fmtBRL(r.vgvAvistaTer)}</V> · <T k="s4p1b">{`Em ${r.nParcelas} meses:`}</T> <V k="terPrazo">{fmtBRL(r.principal.carteiraTer)}</V></small></div>
                    <span className="pct"><V k="terPct">{fmtPct(r.terrenistaPct, 0)}</V></span>
                  </div>
                  <div className="share">
                    <span className="dot" style={{ background: "#122A45" }} />
                    <div><b><T k="s4p2">JBL Incorporadora</T></b><small><T k="s4p2a">À vista:</T> <V k="jblAvista">{fmtBRL(r.vgvAvista * r.jblPct)}</V></small></div>
                    <span className="pct"><V k="jblPct">{fmtPct(r.jblPct, 0)}</V></span>
                  </div>
                  <div className="share">
                    <span className="dot" style={{ background: "#C9D3DE" }} />
                    <div><b><T k="s4p3">Infraestrutura</T></b><small><T k="s4p3a">Orçamento de obras:</T> <V k="custoInfra2">{fmtBRL(r.custoInfra)}</V></small></div>
                    <span className="pct"><V k="infraPct">{fmtPct(r.infraPct, 0)}</V></span>
                  </div>
                </div>
              </div>
              <div className="tip">
                <b><T k="s4TipT">Alternativa: parceria física em lotes.</T></b>{" "}
                <T k="s4Tip">{`Em vez de dinheiro, os proprietários podem receber cerca de ${fmtNum(r.lotes * r.terrenistaPct, 0)} lotes (${fmtPct(r.terrenistaPct, 0)} das unidades), ou um modelo híbrido.`}</T>
              </div>
            </div>
          </section>

          {/* 5. RECEBIMENTOS */}
          <section className="step" id="recebimentos">
            <div className="step-head"><div className="badge">5</div><div>
              <h2><T k="s5Titulo">Quanto a família recebe por mês</T></h2>
              <p><T k="s5Sub">Receitas brutas dos proprietários, considerando 100% das unidades vendidas, por prazo de financiamento.</T></p>
            </div></div>
            <div className="content">
              <div className="tbl">
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}><T k="th1">Prazo</T></th>
                      <th><T k="th2">Parcela do cliente</T></th>
                      <th><T k="th3">Proprietários · receita mensal (1º ano)</T></th>
                      <th><T k="th4">Proprietários · receita mensal (último ano)</T></th>
                      <th><T k="th5">Proprietários · arrecadação final</T></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td><T k="tdAvista">À vista</T></td><td>—</td><td>—</td><td>—</td><td><E k="t.avista">{fmtBRL(r.vgvAvistaTer)}</E></td></tr>
                    {r.cenarios.map((c) => (
                      <tr key={c.meses} className={c.meses === r.nParcelas ? "you" : ""}>
                        <td><E k={`t.${c.meses}.prazo`}>{`${fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos · ${c.meses}x`}</E></td>
                        <td><E k={`t.${c.meses}.parcela`}>{fmtBRL(c.parcela)}</E></td>
                        <td><E k={`t.${c.meses}.mensal`}>{fmtBRL(c.mensalTer)}</E></td>
                        <td><E k={`t.${c.meses}.final`}>{fmtBRL(c.mensalTerFinal)}</E></td>
                        <td><b><E k={`t.${c.meses}.total`}>{fmtBRL(c.carteiraTer)}</E></b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note"><T k="s5Nota">{`As parcelas são reajustadas uma vez por ano em ${fmtPct(r.reajuste)}. Receita bruta, sem dedução de impostos, contabilidade, despesas bancárias, notificações e distratos. Sem considerar a caução de 20% de lotes pelo município, quando houver.`}</T></p>
            </div>
          </section>

          {/* 6. VENDAS */}
          <section className="step" id="vendas">
            <div className="step-head"><div className="badge">6</div><div>
              <h2><T k="s6Titulo">Com que rapidez os lotes vendem</T></h2>
              <p><T k="s6Sub">{`Distribuição estimada dos ${r.vendas.total} lotes nos primeiros meses após o lançamento.`}</T></p>
            </div></div>
            <div className="content">
              <div className="tiles">
                <div className="tile"><div className="k"><T k="s6k1">1º mês · 45%</T></div><div className="v"><V k="vendas1">{`${r.vendas.mes1} lotes`}</V></div></div>
                <div className="tile"><div className="k"><T k="s6k2">2º mês · 35%</T></div><div className="v"><V k="vendas2">{`${r.vendas.mes2} lotes`}</V></div></div>
                <div className="tile"><div className="k"><T k="s6k3">3º mês · 20%</T></div><div className="v"><V k="vendas3">{`${r.vendas.mes3} lotes`}</V></div></div>
              </div>
              <p className="note"><T k="s6Nota">Lançamento estimado: até 120 dias após o protocolo na prefeitura. O número definitivo de lotes depende do projeto aprovado.</T></p>
            </div>
          </section>

          {/* 7. REGRAS */}
          <section className="step" id="regras">
            <div className="step-head"><div className="badge">7</div><div>
              <h2><T k="s7Titulo">Regras, responsabilidades e garantias</T></h2>
            </div></div>
            <div className="content faq">
              <div><b><T k="respT">Responsabilidades</T></b><p><T k="resp" multiline>O parceiro proprietário concorre exclusivamente com a gleba de sua propriedade e a parceira incorporadora concorre integralmente com os recursos financeiros para infraestrutura e demais diligências. Cada parceiro responde pelos tributos da sua parte nas vendas, nos termos do Parecer Normativo CST n.º 15/1984.</T></p></div>
              <div><b><T k="speT">Constituição da parceria</T></b><p><T k="spe" multiline>Constituição de uma SPE - LTDA, com integralização e averbação do imóvel no Cartório de Registro de Imóveis, nos termos das Leis 6.766/79 e 13.465/2017. Havendo cotistas, as condições serão formalizadas em SCP.</T></p></div>
              <div><b><T k="desvioT">Desvio padrão</T></b><p><T k="desvio" multiline>Após os estudos de viabilidade e aprovações, há a possibilidade de um desvio padrão de 14,66% para mais ou para menos nos valores e na quantidade de lotes apresentados.</T></p></div>
              <div><b><T k="avisoT">Aviso legal</T></b><p><T k="aviso" multiline>{`Instrumento confidencial, destinado exclusivamente ao destinatário. Validade de ${options.validadeDias} dias corridos, prorrogável por mais 7 dias mediante solicitação. Informações, estimativas e projeções sujeitas a mudanças e à investigação própria da JBL no avanço das negociações.`}</T></p></div>
            </div>
          </section>
        </div>

        {options.cartaIntencao && (
          <section className="intent" id="carta-intencao">
            <div className="wrap">
              <div className="eyebrow"><T k="intentEyebrow">Próximo passo</T></div>
              <h2><T k="intentTitulo">Carta de intenção</T></h2>
              <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: "70ch" }}>
                <T k="intentTexto">Ao preencher, vocês autorizam a JBL a seguir com os estudos de viabilidade técnica, jurídica, ambiental, comercial e econômica. Não é um contrato e não gera custo para a família.</T>
              </p>
              <IntentForm token={props.token} disabled={mode !== "public"} project={project} areaHa={ha} />
            </div>
          </section>
        )}

        <section className="end">
          <div className="wrap">
            <h2><T k="fimTitulo">Próximos passos</T></h2>
            <p className="lead"><T k="fimTexto">{`Estamos convictos de que a incorporação na gleba ${gleba} representa uma oportunidade estratégica que beneficiará ambas as partes.`}</T></p>
            <div className="next">
              <div><b><T k="passo1t">1. Conversa</T></b><T k="passo1">Uma reunião com a família para tirar todas as dúvidas.</T></div>
              <div><b><T k="passo2t">2. Carta de intenção</T></b><T k="passo2">Para seguirmos com o estudo de viabilidade completo.</T></div>
              <div><b><T k="passo3t">3. Parceria</T></b><T k="passo3">Contrato, SPE e início das aprovações.</T></div>
            </div>
            <div className="contacts">
              <img src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora" />
              <div className="cols">
                <div><b><T k="ct1Nome">Marcelo Aguilar</T></b><T k="ct1Cargo">Diretor de Expansão</T><span><T k="ct1Tel">(11) 94009-1744</T></span></div>
                <div>
                  <b><T k="ct2Nome">{options.corretorNome || "Central JBL"}</T></b>
                  <T k="ct2Cargo">{options.corretorNome ? "Corretor responsável" : "Atendimento"}</T>
                  <span><T k="ct2Tel">{options.corretorTelefone || "(11) 2110-2731"}</T></span>
                </div>
                <div><b><T k="ct3Nome">Matriz</T></b><T k="ct3End">Alameda Rio Negro, 503, Cj. 2011 · Alphaville Empresarial · Barueri/SP</T><span><T k="ct3Email">contato@jblincorporadora.com.br</T></span></div>
              </div>
            </div>
          </div>
        </section>
        <footer className="foot">
          <div className="wrap">
            <span><T k="rodape1">JBL Incorporadora | Proposta de parceria | Confidencial</T></span>
            <span><T k="rodape2">www.jblincorporadora.com.br · @jbl_incorporadora</T></span>
          </div>
        </footer>
      </div>
    </EditProvider>
  );
}
