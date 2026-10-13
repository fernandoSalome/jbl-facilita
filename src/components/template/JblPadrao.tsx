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

export default function JblPadrao(props: TemplateProps) {
  const { project, inputs, options, mode } = props;
  const r = useMemo(() => calcular(inputs), [inputs]);
  const [scroll, setScroll] = useState(0);
  const ha = inputs.areaTotal / 10000;
  const anosTxt = fmtNum(r.nParcelas / 12, 0);
  const gleba = project.name;
  const cidade = `${project.municipio} - ${project.uf}`;

  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      setScroll((h.scrollTop / Math.max(h.scrollHeight - h.clientHeight, 1)) * 100);
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const cta = options.cartaIntencao
    ? { href: "#carta-intencao", label: "Carta de intenção ↓" }
    : { href: `https://wa.me/${WHATSAPP_MARCELO}?text=${encodeURIComponent(`Olá! Recebi a proposta da gleba ${gleba} e gostaria de conversar.`)}`, label: "Falar com a JBL" };

  return (
    <EditProvider overrides={props.overrides} editable={mode === "edit"} onSave={props.onSave}>
      <div className={`jblt ${mode === "edit" ? "editing" : ""} ${mode !== "public" ? "embedded" : ""}`}>
        {mode === "public" && <Tracker token={props.token} />}

        <header className="nav">
          <div className="wrap">
            <a href="#topo" aria-label="JBL Incorporadora e Urbanismo">
              <img className="lockup" src="/brand/lockup.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" />
            </a>
            <nav className="links">
              <a href="#participacao">Sua participação</a>
              <a href="#recebimentos">Recebimentos</a>
              <a href="#execucao">Execução</a>
            </nav>
            <a className="cta-gold" href={cta.href} target={cta.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{cta.label}</a>
          </div>
          <div className="progress" style={{ width: `${scroll}%` }} />
        </header>

        {/* CAPA */}
        <div className="wrap" id="topo">
          <div className="cover-meta">
            <span>Proposta de parceria · Confidencial</span>
            <span>São Paulo, {fmtLongDate(props.date)}</span>
          </div>
          <div className="hero">
            <div>
              <div className="eyebrow">Proposta de parceria</div>
              <h1>
                {gleba}
                <em>{project.tipo} em {project.municipio}</em>
              </h1>
            </div>
            <div className="hero-right">
              <p>
                <E k="txt.hero" label="Texto da capa">{`A família entra com a terra. A JBL entra com os projetos, as obras e as vendas. O resultado é dividido entre os parceiros, em dinheiro, em lotes ou nos dois.`}</E>
              </p>
              <div className="chips">
                <span className="chip">{project.tipo}</span>
                <span className="chip">{cidade}</span>
                {project.matricula && <span className="chip">Matrícula {project.matricula}</span>}
              </div>
              <a className="ghost" href="#participacao">Ver como funciona</a>
            </div>
          </div>
          {project.aerialImage && (
            <figure className="photo">
              <img src={project.aerialImage} alt={`Vista aérea da gleba ${gleba}`} />
              <figcaption>
                <span>Gleba {gleba} · {fmtNum(ha, 4)} hectares</span>
                <small>Imagem fornecida para a proposta. Demarcação indicativa; limites sujeitos à documentação técnica.</small>
              </figcaption>
            </figure>
          )}
          <div className="hero-stats">
            <div><b><E k="v.areaTotal" label="Área total">{fmtM2(inputs.areaTotal)}</E></b><span>área total indicada</span></div>
            <div><b><E k="v.areaUtil" label="Área aproveitável">{fmtM2(r.areaUtil)}</E></b><span>área aproveitável estimada ({fmtPct(inputs.aproveitamento)} da área total)</span></div>
            <div><b>{fmtM2(inputs.metragemLote, 0)}</b><span>lotes de {fmtNum(inputs.frenteLote, 0)} × {fmtNum(r.fundoLote, 0)} metros</span></div>
            <div><b>{project.matricula ?? "—"}</b><span>matrícula do imóvel</span></div>
          </div>
          <div className="quote">
            <blockquote>
              <E k="txt.frase" label="Frase">“O empreendimento mais importante para nós é o realizado!”</E>
              <small>Marcelo Aguilar · Diretor de Expansão</small>
            </blockquote>
            <div className="tech">
              <E k="txt.tecnicos" label="Responsáveis técnicos" multiline>{"Eng.º Felipe Stampini Oliveira Lopes · CREA 248492/D\nArquiteto Fábio Barros Belizário · CAU A117931-4"}</E>
            </div>
          </div>

          {/* CARTA */}
          <article className="letter">
            <div className="letterhead">
              <div className="eyebrow">Uma parceria para realizar</div>
              <img src="/brand/logo-vertical.webp" alt="" />
            </div>
            <h2><E k="txt.saudacao" label="Saudação">{`Prezada ${props.ownerName.toLowerCase().startsWith("família") ? props.ownerName : "Família"},`}</E></h2>
            <p><E k="txt.carta1" label="Carta · 1º parágrafo">{`Recebam nosso abraço e nosso agradecimento pela oportunidade de conhecer a história e o potencial da gleba ${gleba}. Sabemos que uma área carrega o trabalho, os planos e o cuidado de uma família. É com respeito por essa trajetória que apresentamos nossa Proposta Técnica e Comercial de parceria para o parcelamento do solo sob o modelo de ${project.tipo} (Lei Federal n.º 6.766/79), para vossa análise e apreciação. A proposta refere-se à gleba ${gleba}, com área total de ${fmtM2(inputs.areaTotal)}, localizada em ${cidade}.`}</E></p>
            <p><E k="txt.carta2" label="Carta · 2º parágrafo">{`A JBL Incorporadora e Urbanismo é uma empresa especializada em loteamentos e urbanização, com ampla experiência de mercado e profissionais altamente qualificados. Cada novo projeto reúne especialistas em arquitetura, engenharia, ciências biológicas, geologia, direito, administração, contabilidade, perícia de avaliação, topografia, comercial e marketing, viabilizando empreendimentos desde o padrão econômico até o de alto padrão.`}</E></p>
            <p><E k="txt.carta3" label="Carta · 3º parágrafo">{`Nas próximas páginas, compartilhamos as atividades e os números deste projeto, para que vocês possam avaliar a parceria com tranquilidade e clareza. Queremos construir essa decisão juntos, ouvindo suas expectativas e esclarecendo cada dúvida. Nossa estrutura física, equipe capacitada e experiência estão à disposição da família. Será um prazer recebê-los para uma conversa e agendar uma reunião.`}</E></p>
            <p className="sign">Atenciosamente,<br />Marcelo Aguilar<small>Diretor de Expansão</small></p>
          </article>

          <div className="big-idea">
            <div className="eyebrow">A ideia em uma frase</div>
            <h2><E k="txt.ideia" label="A ideia em uma frase">Vocês entram com o terreno. A JBL entra com o dinheiro e o trabalho. O que for vendido é dividido.</E></h2>
            <div className="tiles" style={{ marginTop: 22 }}>
              <div className="tile"><h3>A família</h3><p>Entra com a terra. Não coloca dinheiro nas obras de infraestrutura previstas.</p></div>
              <div className="tile"><h3>A JBL</h3><p>Cuida dos estudos, aprovações, infraestrutura, marketing, vendas e da carteira de recebíveis.</p></div>
              <div className="tile"><h3>Os parceiros</h3><p>Dividem o resultado. A família escolhe receber em dinheiro, em lotes ou numa mistura dos dois.</p></div>
            </div>
          </div>

          <div className="part">Os números do seu terreno</div>

          {/* 1. TERRENO */}
          <section className="step" id="terreno">
            <div className="step-head"><div className="badge">1</div><div>
              <h2>O tamanho do terreno</h2>
              <p>Nem todo o terreno vira lote. Uma parte precisa virar rua, calçada e área verde, como em qualquer bairro.</p>
            </div></div>
            <div className="content">
              <div className="tiles">
                <div className="tile"><div className="k">Terreno inteiro</div><div className="v"><E k="v.areaTotal2" label="Terreno inteiro">{fmtM2(inputs.areaTotal)}</E></div><div className="d">{fmtNum(ha, 4)} hectares.</div></div>
                <div className="tile hl"><div className="k">Vira lotes ({fmtPct(inputs.aproveitamento)})</div><div className="v"><E k="v.areaUtil2" label="Área que vira lotes">{fmtM2(r.areaUtil)}</E></div><div className="d">{fmtNum(r.areaUtil / 10000, 4)} hectares aproveitáveis.</div></div>
                <div className="tile"><div className="k">Número de lotes</div><div className="v"><E k="v.lotes" label="Número de lotes">{fmtNum(r.lotes, 2)}</E></div><div className="d">Estimativa do estudo. Na prática, cerca de {r.lotesInteiros} a {r.lotesInteiros + 1} lotes.</div></div>
              </div>
              <div className="calc">
                <div className="n">=</div>
                <div className="t">De onde vem o número de lotes</div>
                <div className="f"><span>{fmtM2(r.areaUtil)}</span><span className="op">÷</span><span>{fmtM2(inputs.metragemLote, 0)} por lote</span><span className="op">=</span><span className="res">{fmtNum(r.lotes, 2)} lotes equivalentes</span></div>
              </div>
              <p className="note">“Lotes equivalentes” porque não existe fração de lote: é uma conta para estimar valores. O número exato de lotes depende do projeto aprovado.</p>
              <div className="split">
                <div className="s-lots" style={{ width: `${inputs.aproveitamento * 100}%` }}>Parte vira lotes</div>
                <div className="s-streets" style={{ width: `${(1 - inputs.aproveitamento) * 100}%` }}>Ruas, calçadas, áreas verdes e lazer</div>
              </div>
            </div>
          </section>

          {/* 2. OBRAS */}
          <section className="step" id="execucao">
            <div className="step-head"><div className="badge">2</div><div>
              <h2>Quanto custam as obras, e quem paga</h2>
              <p>Toda a infraestrutura é financiada e executada pela JBL.</p>
            </div></div>
            <div className="content">
              <div className="pills">
                {["Topografia e terraplenagem", "Abertura de ruas", "Rede de esgoto", "Rede de água", "Drenagem pluvial", "Rede elétrica", "Asfalto (CBUQ)", "Guias e sarjetas", "Calçadas", "Árvore em frente a cada lote", "Paisagismo"].map((x) => <span key={x}>{x}</span>)}
              </div>
              <div className="calc">
                <div className="n">=</div>
                <div className="t">Orçamento das obras</div>
                <div className="f"><span>{fmtM2(r.areaUtil)}</span><span className="op">×</span><span>{fmtBRL(inputs.custoInfraM2)}/m²</span><span className="op">=</span><span className="res"><E k="v.custoInfra" label="Custo das obras">{fmtBRL(r.custoInfra)}</E></span></div>
                <p className="why">O custo resulta da área aproveitável multiplicada pelo valor de infraestrutura por m².</p>
              </div>
              <div className="tip good"><b>A JBL financia e executa a infraestrutura.</b> Em nenhuma hipótese será solicitado aos proprietários da área quantias ou valores para execução desses serviços.</div>
              <div className="gantt-wrap">
                <div className="gantt">
                  <div className="h" style={{ textAlign: "left" }}>Obra</div><div className="h">1º ano</div><div className="h">2º ano</div><div className="h">3º ano</div><div className="h">4º ano</div>
                  {[["Drenagem e esgoto", 0], ["Água", 1], ["Elétrica", 2], ["Pavimentação", 3]].map(([l, on]) => (
                    <div key={l as string} style={{ display: "contents" }}>
                      <div className="l">{l}</div>
                      {[0, 1, 2, 3].map((i) => <div key={i} className={`c ${i === on ? "on" : ""}`} />)}
                    </div>
                  ))}
                  <div className="l">Outros</div>{[0, 1, 2, 3].map((i) => <div key={i} className="c on" style={{ opacity: 0.45 }} />)}
                </div>
              </div>
            </div>
          </section>

          {/* 3. VGV */}
          <section className="step" id="vgv">
            <div className="step-head"><div className="badge">3</div><div>
              <h2>Quanto vale tudo isso (VGV)</h2>
              <p>VGV é o Valor Geral de Vendas: a soma do que os lotes valem quando vendidos.</p>
            </div></div>
            <div className="content chain">
              <div className="calc">
                <div className="n">1</div><div className="t">Preço do lote à vista</div>
                <div className="f"><span>{fmtM2(inputs.metragemLote, 0)}</span><span className="op">×</span><span>{fmtBRL(inputs.valorM2)} por m²</span><span className="op">=</span><span className="res"><E k="v.valorLote" label="Preço do lote à vista">{fmtBRL(r.valorLote)}</E></span></div>
                <p className="why">Preço de mercado estimado a partir de corretores da região e pesquisas.</p>
              </div>
              <div className="calc">
                <div className="n">2</div><div className="t">Entrada do comprador ({fmtPct(inputs.entradaPct)})</div>
                <div className="f"><span>{fmtBRL(r.valorLote)}</span><span className="op">×</span><span>{fmtPct(inputs.entradaPct)}</span><span className="op">=</span><span className="res"><E k="v.entrada" label="Entrada">{fmtBRL(r.entrada)}</E></span></div>
              </div>
              <div className="calc">
                <div className="n">3</div><div className="t">Parcela do comprador em {r.nParcelas} meses</div>
                <div className="f"><span>({fmtBRL0(r.valorLote)} − {fmtBRL0(r.entrada)})</span><span className="op">×</span><span>{fmtNum(inputs.multiplicador, 2)}</span><span className="op">÷</span><span>{r.nParcelas}</span><span className="op">=</span><span className="res"><E k="v.parcela" label="Parcela do comprador">{fmtBRL(r.parcela)}</E></span></div>
                <p className="why">O multiplicador de {fmtNum(inputs.multiplicador, 2)} incorpora os juros do financiamento próprio. A parcela é reajustada uma vez por ano em {fmtPct(r.reajuste)} (IPCA + juros).</p>
              </div>
              <div className="calc">
                <div className="n">4</div><div className="t">VGV total à vista</div>
                <div className="f"><span>{fmtNum(r.lotes, 2)} lotes</span><span className="op">×</span><span>{fmtBRL0(r.valorLote)}</span><span className="op">=</span><span className="res"><E k="v.vgvAvista" label="VGV à vista">{fmtBRL(r.vgvAvista)}</E></span></div>
              </div>
              <div className="calc">
                <div className="n">5</div><div className="t">VGV global projetado em {r.nParcelas} meses</div>
                <div className="f"><span>Carteira com reajuste de {fmtPct(r.reajuste)} ao ano</span><span className="op">=</span><span className="res big"><E k="v.vgvGlobal" label="VGV global projetado">{fmtBRL(r.principal.carteiraEmp)}</E></span></div>
                <p className="why">Soma de todas as parcelas que os compradores pagam em {anosTxt} anos, já com o reajuste anual, considerando 100% dos lotes vendidos.</p>
              </div>
            </div>
          </section>

          {/* 4. DIVISÃO */}
          <section className="step" id="participacao">
            <div className="step-head"><div className="badge">4</div><div>
              <h2>Como o dinheiro é dividido</h2>
              <p>Participação de cada parte sobre o VGV.</p>
            </div></div>
            <div className="content">
              <div className="pie-row">
                <Pie parts={[{ pct: r.terrenistaPct, color: "#C1943D" }, { pct: r.jblPct, color: "#122A45" }, { pct: r.infraPct, color: "#C9D3DE" }]} />
                <div className="shares">
                  <div className="share you">
                    <span className="dot" style={{ background: "#C1943D" }} />
                    <div><b>Proprietários</b><small>À vista: <E k="v.terAvista" label="Proprietários à vista">{fmtBRL(r.vgvAvistaTer)}</E> · Em {r.nParcelas} meses: <E k="v.terPrazo" label="Proprietários em parcelas">{fmtBRL(r.principal.carteiraTer)}</E></small></div>
                    <span className="pct"><E k="v.terPct" label="% Proprietários">{fmtPct(r.terrenistaPct, 0)}</E></span>
                  </div>
                  <div className="share">
                    <span className="dot" style={{ background: "#122A45" }} />
                    <div><b>JBL Incorporadora</b><small>À vista: {fmtBRL(r.vgvAvista * r.jblPct)}</small></div>
                    <span className="pct"><E k="v.jblPct" label="% JBL">{fmtPct(r.jblPct, 0)}</E></span>
                  </div>
                  <div className="share">
                    <span className="dot" style={{ background: "#C9D3DE" }} />
                    <div><b>Infraestrutura</b><small>Orçamento de obras: {fmtBRL(r.custoInfra)}</small></div>
                    <span className="pct"><E k="v.infraPct" label="% Infraestrutura">{fmtPct(r.infraPct, 0)}</E></span>
                  </div>
                </div>
              </div>
              <div className="tip"><b>Alternativa: parceria física em lotes.</b> Em vez de dinheiro, os proprietários podem receber cerca de <E k="v.lotesTer" label="Lotes dos proprietários">{`${fmtNum(r.lotes * r.terrenistaPct, 0)} lotes`}</E> ({fmtPct(r.terrenistaPct, 0)} das unidades), ou um modelo híbrido.</div>
            </div>
          </section>

          {/* 5. RECEBIMENTOS */}
          <section className="step" id="recebimentos">
            <div className="step-head"><div className="badge">5</div><div>
              <h2>Quanto a família recebe por mês</h2>
              <p>Receitas brutas dos proprietários, considerando 100% das unidades vendidas, por prazo de financiamento.</p>
            </div></div>
            <div className="content">
              <div className="tbl">
                <table>
                  <thead>
                    <tr><th style={{ textAlign: "left" }}>Prazo</th><th>Parcela do cliente</th><th>Proprietários · receita mensal (1º ano)</th><th>Proprietários · receita mensal (último ano)</th><th>Proprietários · arrecadação final</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>À vista</td><td>—</td><td>—</td><td>—</td><td><E k="t.avista" label="À vista · arrecadação final">{fmtBRL(r.vgvAvistaTer)}</E></td></tr>
                    {r.cenarios.map((c) => (
                      <tr key={c.meses} className={c.meses === r.nParcelas ? "you" : ""}>
                        <td>{fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos · {c.meses}x</td>
                        <td><E k={`t.${c.meses}.parcela`} label={`${c.meses}x · parcela`}>{fmtBRL(c.parcela)}</E></td>
                        <td><E k={`t.${c.meses}.mensal`} label={`${c.meses}x · receita mensal`}>{fmtBRL(c.mensalTer)}</E></td>
                        <td><E k={`t.${c.meses}.final`} label={`${c.meses}x · último ano`}>{fmtBRL(c.mensalTerFinal)}</E></td>
                        <td><b><E k={`t.${c.meses}.total`} label={`${c.meses}x · arrecadação final`}>{fmtBRL(c.carteiraTer)}</E></b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note">As parcelas são reajustadas uma vez por ano em {fmtPct(r.reajuste)}. Receita bruta, sem dedução de impostos, contabilidade, despesas bancárias, notificações e distratos. Sem considerar a caução de 20% de lotes pelo município, quando houver.</p>
            </div>
          </section>

          {/* 6. VENDAS */}
          <section className="step" id="vendas">
            <div className="step-head"><div className="badge">6</div><div>
              <h2>Com que rapidez os lotes vendem</h2>
              <p>Distribuição estimada dos {r.vendas.total} lotes nos primeiros meses após o lançamento.</p>
            </div></div>
            <div className="content">
              <div className="tiles">
                <div className="tile"><div className="k">1º mês · 45%</div><div className="v"><E k="v.vendas1" label="Vendas 1º mês">{`${r.vendas.mes1} lotes`}</E></div></div>
                <div className="tile"><div className="k">2º mês · 35%</div><div className="v"><E k="v.vendas2" label="Vendas 2º mês">{`${r.vendas.mes2} lotes`}</E></div></div>
                <div className="tile"><div className="k">3º mês · 20%</div><div className="v"><E k="v.vendas3" label="Vendas 3º mês">{`${r.vendas.mes3} lotes`}</E></div></div>
              </div>
              <p className="note">Lançamento estimado: até 120 dias após o protocolo na prefeitura. O número definitivo de lotes depende do projeto aprovado.</p>
            </div>
          </section>

          {/* 7. REGRAS */}
          <section className="step" id="regras">
            <div className="step-head"><div className="badge">7</div><div>
              <h2>Regras, responsabilidades e garantias</h2>
            </div></div>
            <div className="content faq">
              <div><b>Responsabilidades</b><p><E k="txt.resp" label="Responsabilidades" multiline>{"O parceiro proprietário concorre exclusivamente com a gleba de sua propriedade e a parceira incorporadora concorre integralmente com os recursos financeiros para infraestrutura e demais diligências. Cada parceiro responde pelos tributos da sua parte nas vendas, nos termos do Parecer Normativo CST n.º 15/1984."}</E></p></div>
              <div><b>Constituição da parceria</b><p><E k="txt.spe" label="Constituição da parceria" multiline>{"Constituição de uma SPE - LTDA, com integralização e averbação do imóvel no Cartório de Registro de Imóveis, nos termos das Leis 6.766/79 e 13.465/2017. Havendo cotistas, as condições serão formalizadas em SCP."}</E></p></div>
              <div><b>Desvio padrão</b><p><E k="txt.desvio" label="Desvio padrão" multiline>{"Após os estudos de viabilidade e aprovações, há a possibilidade de um desvio padrão de 14,66% para mais ou para menos nos valores e na quantidade de lotes apresentados."}</E></p></div>
              <div><b>Aviso legal</b><p>{`Instrumento confidencial, destinado exclusivamente ao destinatário. Validade de ${options.validadeDias} dias corridos, prorrogável por mais 7 dias mediante solicitação. Informações, estimativas e projeções sujeitas a mudanças e à investigação própria da JBL no avanço das negociações.`}</p></div>
            </div>
          </section>
        </div>

        {options.cartaIntencao && (
          <section className="intent" id="carta-intencao">
            <div className="wrap">
              <div className="eyebrow">Próximo passo</div>
              <h2>Carta de intenção</h2>
              <p style={{ color: "var(--muted)", marginTop: 8, maxWidth: "70ch" }}>
                Ao preencher, vocês autorizam a JBL a seguir com os estudos de viabilidade técnica, jurídica, ambiental, comercial e econômica. Não é um contrato e não gera custo para a família.
              </p>
              <IntentForm token={props.token} disabled={mode !== "public"} project={project} areaHa={ha} />
            </div>
          </section>
        )}

        <section className="end">
          <div className="wrap">
            <h2>Próximos passos</h2>
            <p className="lead">Estamos convictos de que a incorporação na gleba {gleba} representa uma oportunidade estratégica que beneficiará ambas as partes.</p>
            <div className="next">
              <div><b>1. Conversa</b>Uma reunião com a família para tirar todas as dúvidas.</div>
              <div><b>2. Carta de intenção</b>Para seguirmos com o estudo de viabilidade completo.</div>
              <div><b>3. Parceria</b>Contrato, SPE e início das aprovações.</div>
            </div>
            <div className="contacts">
              <img src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora" />
              <div className="cols">
                <div><b>Marcelo Aguilar</b>Diretor de Expansão<span>(11) 94009-1744</span></div>
                <div>
                  <b>{options.corretorNome ? options.corretorNome : "Central JBL"}</b>
                  {options.corretorNome ? "Corretor responsável" : "Atendimento"}
                  <span>{options.corretorTelefone || "(11) 2110-2731"}</span>
                </div>
                <div><b>Matriz</b>Alameda Rio Negro, 503, Cj. 2011 · Alphaville Empresarial · Barueri/SP<span>contato@jblincorporadora.com.br</span></div>
              </div>
            </div>
          </div>
        </section>
        <footer className="foot">
          <div className="wrap">
            <span>JBL Incorporadora | Proposta de parceria | Confidencial</span>
            <span>www.jblincorporadora.com.br · @jbl_incorporadora</span>
          </div>
        </footer>
      </div>
    </EditProvider>
  );
}
