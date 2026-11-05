"use client";

import { createContext, useContext } from "react";
import type { DadosCustos, Grupo } from "@/lib/apresentacao/planilha";
import { pilha, type Conteudo, type Formato } from "@/lib/apresentacao/tipos";
import "./apresentacao.css";

/**
 * Página de apresentação dos custos (o mesmo desenho para o proprietário e para a edição).
 * Os números vêm da planilha; só os textos e a aparência mudam.
 */

type Edicao = { selecionado: string | null; selecionar: (k: string) => void; setTexto: (k: string, v: string) => void };
const Ctx = createContext<{ c: Conteudo; ed: Edicao | null }>({ c: null as unknown as Conteudo, ed: null });

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: Number.isInteger(n) ? 0 : casas, maximumFractionDigits: casas });
const pct = (n: number) => `${(n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function estiloDoTexto(f?: Formato): React.CSSProperties {
  if (!f) return {};
  return {
    ...(f.fonte ? { fontFamily: pilha(f.fonte) } : {}),
    ...(f.tamanho ? { fontSize: `${f.tamanho}px` } : {}),
    ...(f.negrito !== undefined ? { fontWeight: f.negrito ? 700 : 400 } : {}),
    ...(f.cor ? { color: f.cor } : {}),
    ...(f.fundo ? { backgroundColor: f.fundo, padding: "0 .2em", borderRadius: 3 } : {}),
  };
}

/** Texto editável: clicar seleciona (a barra de cima muda a aparência); o texto muda direto na página */
function T({ k, padrao, as: Tag = "span", className = "" }: { k: string; padrao: string; as?: "span" | "p" | "h1" | "h2" | "h3" | "div"; className?: string }) {
  const { c, ed } = useContext(Ctx);
  const texto = c.textos[k] ?? padrao;
  const style = estiloDoTexto(c.formatos[k]);
  if (!ed) return <Tag className={className} style={style}>{texto}</Tag>;
  return (
    <Tag
      key={texto}
      className={`${className} ap-ed ${ed.selecionado === k ? "ap-sel" : ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      onFocus={() => ed.selecionar(k)}
      onBlur={(e) => {
        const v = e.currentTarget.innerText.replace(/\n{3,}/g, "\n\n").trim();
        if (v !== texto) ed.setTexto(k, v || padrao);
      }}
    >
      {texto}
    </Tag>
  );
}

/** Explicação simples de cada grupo (pode ser trocada na edição) */
const EXPLICA: [RegExp, string][] = [
  [/canteiro|cateiro/i, "Estrutura de apoio da obra: ligações provisórias de água e energia, preparo do local, vigilância e acompanhamento de engenheiro e topografia durante a execução."],
  [/prepara/i, "Preparo do terreno antes das obras: roçada, horas de máquina, caminhões, descarte e abertura das ruas."],
  [/energia/i, "Rede elétrica que leva energia até cada lote e a iluminação pública das ruas."],
  [/paviment/i, "Base e revestimento das ruas, para a circulação de carros e pedestres."],
  [/água|agua/i, "Rede que leva água a cada lote, com reservatório, poço, registros e ligações."],
  [/esgoto/i, "Rede que coleta o esgoto de cada lote, com poços de visita e ligações."],
  [/drenagem/i, "Sistema que recolhe a água da chuva das ruas: tubos, poços de visita e bocas de lobo."],
  [/paisag/i, "Árvores, plantio e jardins que valorizam o empreendimento."],
  [/constru/i, "Construções de uso comum, como portaria, áreas de lazer e fechamento."],
  [/jur[ií]dica/i, "Abertura da empresa do empreendimento (SPE) e os serviços advocatícios."],
  [/documenta/i, "Taxas de aprovação, licenças e registros na prefeitura e no cartório."],
  [/projetos/i, "Projeto urbanístico, projetos complementares e demarcação dos lotes."],
  [/sede/i, "Custos administrativos da operação durante a obra."],
  [/marketing/i, "Divulgação e vendas: redes sociais, site, material gráfico, outdoor, stand e agência."],
];
const explica = (nome: string) => EXPLICA.find(([r]) => r.test(nome))?.[1] ?? "";

function Logo({ pequena = false }: { pequena?: boolean }) {
  const { c } = useContext(Ctx);
  const h = pequena ? Math.max(24, Math.round(c.estilo.logoAltura * 0.7)) : c.estilo.logoAltura;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="ap-logo" src={c.estilo.logo || "/brand/lockup.webp"} alt="Grupo JBL Incorporadora" style={{ height: h }} />;
}

function GrupoObras({ g }: { g: Grupo }) {
  const fora = g.implanta === false;
  const itens = g.itens.filter((i) => i.total);
  return (
    <article className={`ap-card ${fora ? "ap-fora" : ""}`}>
      <header className="ap-card-h">
        <div>
          <T k={`${g.id}.nome`} padrao={g.nome} as="h3" className="ap-card-t" />
          <T k={`${g.id}.desc`} padrao={explica(g.nome)} as="p" className="ap-card-d" />
        </div>
        <div className="ap-card-v">
          {fora ? <T k={`${g.id}.fora`} padrao="Não incluído nesta etapa" className="ap-tag" /> : <span className="ap-sub">{brl(g.total ?? 0)}</span>}
        </div>
      </header>
      {itens.length > 0 && (
        <div className="ap-tab" role="table">
          <div className="ap-tr ap-th" role="row">
            <span role="columnheader"><T k="col.item" padrao="Item" /></span>
            <span role="columnheader"><T k="col.qtd" padrao="Quantidade" /></span>
            <span role="columnheader"><T k="col.unit" padrao="Valor unitário" /></span>
            <span role="columnheader"><T k="col.total" padrao="Total" /></span>
          </div>
          {itens.map((i) => (
            <div className="ap-tr" role="row" key={i.id}>
              <span role="cell" className="ap-item">
                <T k={`${i.id}.nome`} padrao={i.nome} />
                {i.opcao && <small className="ap-op">{i.opcao}</small>}
              </span>
              <span role="cell" data-l="Quantidade">{i.quantidade !== null ? `${num(i.quantidade)}${i.unidade ? ` ${i.unidade}` : ""}` : "—"}</span>
              <span role="cell" data-l="Valor unitário">{i.unitario !== null ? brl(i.unitario) : "—"}</span>
              <span role="cell" data-l="Total" className="ap-tot">{brl(i.total!)}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function GrupoGestao({ g }: { g: Grupo }) {
  const itens = g.itens.filter((i) => i.total);
  return (
    <article className="ap-card">
      <header className="ap-card-h">
        <div>
          <T k={`${g.id}.nome`} padrao={g.nome} as="h3" className="ap-card-t" />
          <T k={`${g.id}.desc`} padrao={explica(g.nome)} as="p" className="ap-card-d" />
        </div>
        <div className="ap-card-v"><span className="ap-sub">{brl(g.total ?? 0)}</span></div>
      </header>
      {itens.length > 0 && (
        <ul className="ap-lista">
          {itens.map((i) => (
            <li key={i.id}>
              <T k={`${i.id}.nome`} padrao={i.nome} />
              <span className="ap-tot">{brl(i.total!)}{i.unidade ? <small> / {i.unidade === "mês" ? "mês" : i.unidade === "un." ? "unid." : i.unidade}</small> : null}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function Apresentacao({ c, ed = null }: { c: Conteudo; ed?: Edicao | null }) {
  const d: DadosCustos = c.dados;
  const e = c.estilo;
  const vars = {
    "--ap-principal": e.corPrincipal,
    "--ap-destaque": e.corDestaque,
    "--ap-fundo": e.corFundo,
    "--ap-texto": e.corTexto,
    "--ap-fonte": pilha(e.fonte),
    "--ap-fonte-t": pilha(e.fonteTitulos),
  } as React.CSSProperties;
  const maior = Math.max(...d.resumo.map((r) => Math.abs(r.valor)), 1);
  const dataLeitura = new Date(d.lidoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const fatos: [string, string, string][] = [
    ["info.tipo", "Tipo", d.info.tipo ?? ""],
    ["info.area", "Área total", d.info.area !== null ? `${num(d.info.area)} m²` : ""],
    ["info.lotes", "Lotes", d.info.lotes !== null ? num(d.info.lotes) : ""],
    ["info.lote", "Tamanho do lote", d.info.lote !== null ? `${num(d.info.lote)} m²` : ""],
    ["info.regiao", "Região de preços", d.info.regiao ?? ""],
    ["info.meses", "Prazo das obras", d.info.meses !== null ? `${num(d.info.meses, 0)} meses` : ""],
  ];
  return (
    <Ctx.Provider value={{ c, ed }}>
      <div className="apc" style={vars}>
        <header className="ap-top">
          <div className="ap-wrap ap-top-in">
            <Logo />
            <T k="topo" padrao="Apresentação de custos" className="ap-top-r" />
          </div>
        </header>

        <section className="ap-hero">
          <div className="ap-wrap">
            <T k="eyebrow" padrao="Custos do empreendimento" as="p" className="ap-eyebrow" />
            <T k="titulo" padrao="Chácaras Primavera" as="h1" className="ap-h1" />
            <T
              k="intro"
              padrao="Este material mostra, de forma simples, quanto custa tirar o empreendimento do papel: as obras de infraestrutura, os projetos, a documentação e a gestão. Todos os números vêm da planilha de custos da JBL."
              as="p"
              className="ap-intro"
            />
            <div className="ap-total">
              <T k="totalRotulo" padrao="Custo total estimado do empreendimento" as="p" className="ap-total-l" />
              <p className="ap-total-v">{d.total !== null ? brl(d.total) : "—"}</p>
            </div>
            <dl className="ap-fatos">
              {fatos.filter(([, , v]) => v).map(([k, rot, v]) => (
                <div key={k}>
                  <dt><T k={k} padrao={rot} /></dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="ap-sec">
          <div className="ap-wrap">
            <T k="resumo.t" padrao="Para onde vai o dinheiro" as="h2" className="ap-h2" />
            <T k="resumo.d" padrao="Cada parte do custo total, do maior para o menor peso no orçamento." as="p" className="ap-sec-d" />
            <div className="ap-resumo">
              {[...d.resumo].sort((a, b) => b.valor - a.valor).map((r) => (
                <div className="ap-rl" key={r.id}>
                  <div className="ap-rl-top">
                    <T k={`${r.id}.nome`} padrao={r.nome} className="ap-rl-n" />
                    <span className="ap-rl-v">{brl(r.valor)}{r.pct !== null && <small>{pct(r.pct)}</small>}</span>
                  </div>
                  <div className="ap-bar"><i style={{ width: `${(Math.abs(r.valor) / maior) * 100}%` }} className={r.valor < 0 ? "neg" : ""} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="ap-sec">
          <div className="ap-wrap">
            <T k="obras.t" padrao="Obras e infraestrutura" as="h2" className="ap-h2" />
            <T k="obras.d" padrao="O que será construído no terreno, com as quantidades e os valores de cada item." as="p" className="ap-sec-d" />
            <div className="ap-cards">{d.obras.map((g) => <GrupoObras key={g.id} g={g} />)}</div>
          </div>
        </section>

        {d.gestao.length > 0 && (
          <section className="ap-sec">
            <div className="ap-wrap">
              <T k="gestao.t" padrao="Projetos, documentação e gestão" as="h2" className="ap-h2" />
              <T
                k="gestao.d"
                padrao="Custos para aprovar, registrar, administrar e vender o empreendimento. Alguns itens são por lote ou por mês; o total de cada grupo já considera as quantidades."
                as="p"
                className="ap-sec-d"
              />
              <div className="ap-cards ap-cards-2">{d.gestao.map((g) => <GrupoGestao key={g.id} g={g} />)}</div>
            </div>
          </section>
        )}

        <section className="ap-sec ap-fim">
          <div className="ap-wrap">
            <div className="ap-total ap-total-fim">
              <T k="fimRotulo" padrao="Custo total estimado" as="p" className="ap-total-l" />
              <p className="ap-total-v">{d.total !== null ? brl(d.total) : "—"}</p>
            </div>
            <T
              k="nota"
              padrao="Os valores são estimativas da planilha de custos da JBL, com preços de referência da região, e podem mudar com os projetos aprovados e os orçamentos dos fornecedores."
              as="p"
              className="ap-nota"
            />
            <p className="ap-data">
              <T k="dataRotulo" padrao="Dados da planilha atualizados em" /> {dataLeitura}
            </p>
          </div>
        </section>

        <footer className="ap-rodape">
          <div className="ap-wrap ap-rodape-in">
            <Logo pequena />
            <T k="rodape" padrao="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" />
          </div>
        </footer>
      </div>
    </Ctx.Provider>
  );
}
