"use client";

import { Fragment, useState } from "react";
import { fmtNum } from "@/lib/format";
import { E } from "./Editable";

/**
 * Carta de intenção: formulário no layout do site da proposta (campos à esquerda,
 * carta montando sozinha à direita). O envio continua indo para o servidor e
 * aparece como "Assinada" na lista de propostas.
 */

type Campos = Record<string, string>;
type Projeto = { name: string; municipio: string; uf: string; matricula: string | null };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const hoje = () => {
  const d = new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const fmtData = (s: string) => (s ? s.split("-").reverse().join("/") : "");
const low = (s: string) => s.toLowerCase();
const TITULO = "CARTA DE INTENÇÃO - PARCERIA IMOBILIÁRIA";

type Parte = string | { blank: string } | { b: string };
type Paragrafo = { h?: boolean; partes: Parte[] };

/** Texto da carta (mesmo do site), com os dados do projeto e os campos preenchidos */
function paragrafos(v: Campos, p: Projeto): Paragrafo[] {
  const f = (x: string, ph: string): Parte => (x ? x : { blank: ph });
  const P = (...partes: Parte[]): Paragrafo => ({ partes });
  const H = (t: string): Paragrafo => ({ h: true, partes: [t] });
  const out: Paragrafo[] = [];
  out.push(P("Ambas as partes reconhecem que esta carta de intenção de parceria não cria uma obrigação legal vinculativa entre elas. No entanto, caso as partes concordem em estabelecer uma parceria formal no futuro, esta carta será usada como base para as negociações e elaboração de um contrato formal. As partes reconhecem que podem desistir desta intenção de parceria a qualquer momento, respeitado o prazo de estudo de viabilidade, e antes da celebração de um contrato formal por meio de uma comunicação por escrito, sem qualquer penalidade ou responsabilidade perante a outra parte."));

  const q: Parte[] = [
    { b: "JBL INCORPORADORA URBANISMO E EMPREENDIMENTOS LTDA," },
    " pessoa jurídica de direito privado, com nome fantasia, ",
    { b: "GRUPO JBL INCORPORADORA E URBANISMO" },
    ", com sede jurídica na Alameda Rio Negro, n.º 503, Cj. 2011, 20º andar – Alphaville Empresarial, Barueri/SP, representada neste ato por seu sócio administrador, doravante ",
    { b: "DENOMINADA EMPREENDEDORA PROPONENTE" },
    ", propõe nos termos a seguir, a presente carta de intenção, para formalização de uma parceria imobiliária com ",
    v.p_nome ? { b: v.p_nome.toUpperCase() } : { blank: "nome completo" },
  ];
  let t = `, ${v.p_nac ? low(v.p_nac) : "brasileiro(a)"}`;
  const uniao = /uni/i.test(v.estado_civil);
  const casado = /casad/i.test(v.estado_civil) || (!v.estado_civil && !!(v.j_nome || v.c_data || v.c_regime));
  if (v.estado_civil && !casado && !uniao) t += `, ${low(v.estado_civil)}`;
  if (v.p_prof) t += `, ${low(v.p_prof)}`;
  q.push(t + ", RG: n.º ", f(v.p_rg, "RG"), ", CPF: n.º ", f(v.p_cpf, "CPF"));
  if (casado || uniao) {
    let c = (uniao ? ", em união estável" : ", casado(a)") + (v.c_data ? ` em ${fmtData(v.c_data)}` : "") + (v.c_regime ? `, sob o regime de ${low(v.c_regime)}` : "");
    if (v.c_matricula) c += `, conforme certidão de casamento matriculada sob o n.º ${v.c_matricula}${v.c_rcpn ? ` do ${v.c_rcpn}` : ""}${v.c_municipio ? ` da comarca de ${v.c_municipio}` : ""}`;
    q.push(c);
    if (v.j_nome) {
      q.push(", com ", { b: v.j_nome.toUpperCase() });
      q.push(`${v.j_nac ? `, ${low(v.j_nac)}` : ""}${v.j_prof ? `, ${low(v.j_prof)}` : ""}${v.j_rg ? `, RG: n.º ${v.j_rg}` : ""}${v.j_cpf ? `, CPF: n.º ${v.j_cpf}` : ""}`);
    }
  }
  q.push(", residente(s) e domiciliado(s) na ", f(v.p_end, "endereço"), ", ", { b: "DENOMINADOS PROPRIETÁRIOS TERRENISTAS - COTISTA" }, ".");
  out.push(P(...q));

  out.push(H("I – DA EMPRESA PROPONENTE"));
  out.push(P("A empresa ", { b: "PROPONENTE" }, ", pessoa jurídica de direito privado, com nome fantasia, ", { b: "GRUPO JBL INCORPORADORA E URBANISMO" }, ", com atividade principal de incorporação de empreendimentos imobiliários, tendo experiência na implantação de Parcelamentos de Solos Urbano e Rural."));
  out.push(P("Atua no mercado imobiliário implantando empreendimentos de loteamentos e condomínios em todo o território nacional."));
  out.push(H("II – DO PARCEIRO – PROPRIETÁRIOS TERRENISTAS - COTISTAS"));
  const mun = v.i_municipio || `${p.municipio}/${p.uf}`;
  out.push(P(
    { b: "OS PROPRIETÁRIOS" }, " acima qualificados são legítimos proprietários e possuidores do imóvel rural com área total de ", f(v.i_area, "área"),
    ` hectares, denominado Gleba ${p.name}${v.i_zona ? `, situado em ${v.i_zona}` : ""}, Município e Comarca de ${mun}, registrado no `,
    f(v.i_cartorio, "Cartório de Registro de Imóveis"), ", na matrícula n.º ", f(v.i_matriculas, "matrícula"), `${v.i_car ? `, CAR n.º ${v.i_car}` : ""}.`,
  ));
  out.push(H("III – A EMPREENDEDORA PROPONENTE"));
  out.push(P("Por meio desta carta de intenção, propõe a ", { b: "EMPREENDEDORA PROPONENTE" }, " firmar uma eventual parceria imobiliária com a ", { b: "PROPRIETÁRIA TERRENISTA-COTISTA" }, ", em que este figurará como ", { b: "PARCEIRO PROPRIETÁRIO" }, ", enquanto aquela figurará como ", { b: "PARCEIRA EMPREENDEDORA" }, "."));
  out.push(P("O ", { b: "PARCEIRO PROPRIETÁRIO TERRENISTA-COTISTA" }, " disponibilizará o imóvel para a ", { b: "REALIZAÇÃO" }, " de loteamento aberto de lotes residencial, industrial e chacreamento, ou seja, o que o estudo preliminar mostrou."));
  out.push(H("IV – OS RESULTADOS"));
  out.push(P("Os resultados auferidos na eventual parceria serão distribuídos nos percentuais fixados entre as partes no contrato de parceria, que será firmado por via da formalização de uma ", { b: "sociedade de propósito específico (SPE)" }, ", na forma da lei."));
  out.push(H("V – PRAZO PARA O ESTUDO DE VIABILIDADE"));
  out.push(P("Fixa-se o prazo de 30 (trinta) dias corridos para o complemento dos estudos necessários de viabilidade, bem como para as seguintes ações, independentemente de ordem cronológica, ", { b: "dentre outras" }, ", cujos gastos serão da ", { b: "PARCEIRA EMPREENDEDORA:" }, "\na) transformação da área rural para urbana, de expansão urbana ou de urbanização específica;\nb) eventual organização das matrículas (desmembramento, remembramento);\nc) aprovação pelo município, se necessária, da lei de loteamento de lotes e;\nd) reformulação do projeto urbanístico a pedido do Município etc."));
  out.push(P({ b: "Dentro do prazo acima, bem como da prorrogação, os PROPRIETÁRIOS se comprometem a não oferecer a área para outro empreendedor." }));
  out.push(P("O prazo acima estipulado pode ser prorrogado por interesse das partes, por igual prazo de 30 (trinta) dias, quando assinarão um termo aditivo."));
  out.push(H("VI – EM CASO DE INVIABILIDADE"));
  out.push(P("Na hipótese de se verificar a ", { b: "INVIABILIDADE" }, " do projeto pela ", { b: "PARCEIRA EMPREENDEDORA" }, ", o presente acordo será extinto sem quaisquer ônus para as Partes, e sem que haja a obrigatoriedade da apresentação dos estudos pelo Parceiro Empreendedor."));
  out.push(H("VII – EM CASO DE VIABILIDADE"));
  out.push(P("Uma vez constatada a ", { b: "VIABILIDADE" }, " do projeto, a ", { b: "PROPONENTE EMPREENDEDORA" }, " apresentará aos ", { b: "PROPRIETÁRIOS" }, " uma proposta definitiva da minuta da SPE, que deverá ser livremente analisada, na qual estará prevista a responsabilidade da ", { b: "EMPREENDEDORA" }, " de aportar os recursos técnicos e financeiros e disponibilizar a sua estrutura e expertise para viabilização e execução e término do ", { b: "projeto de loteamento" }, " na área acima descrita, com a infraestrutura completa exigida pelo município."));
  out.push(P("Nesta hipótese de viabilidade do projeto, e enquanto não assinada a Parceria por intermédio da SPE, a ", { b: "PROPONENTE EMPREENDEDORA" }, " também não se obriga a apresentar os projetos/estudos realizados até então."));
  out.push(P(`${mun.split(/[/-]/)[0].trim()}, ${hoje()}.`));
  return out;
}

function Texto({ partes }: { partes: Parte[] }) {
  return (
    <>
      {partes.map((x, i) => {
        if (typeof x !== "string") {
          if ("b" in x) return <strong key={i}>{x.b}</strong>;
          return <span key={i} className="fill empty">[{x.blank}]</span>;
        }
        const linhas = x.split("\n");
        return <Fragment key={i}>{linhas.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{l}</Fragment>)}</Fragment>;
      })}
    </>
  );
}

function readFile(file: File): Promise<{ name: string; type: string; data: string }> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res({ name: file.name, type: file.type, data: String(fr.result) });
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export default function IntentForm({ token, disabled, project, areaHa }: { token: string; disabled: boolean; project: Projeto; areaHa: number }) {
  const [v, setV] = useState<Campos>(() => ({
    i_area: fmtNum(areaHa, 4),
    i_municipio: `${project.municipio}/${project.uf}`,
    i_matriculas: project.matricula ?? "",
  }));
  const [ok, setOk] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const g = (k: string) => (v[k] ?? "").trim();
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((o) => ({ ...o, [k]: e.target.value }));

  const L = ({ k, children, req }: { k: string; children: string; req?: boolean }) => (
    <label htmlFor={`ci-${k}`}><E k={`form.${k}`}>{children}</E>{req && <> <span className="req">*</span></>}</label>
  );
  const I = ({ k, label, req, type = "text", ph, mode }: { k: string; label: string; req?: boolean; type?: string; ph?: string; mode?: "numeric" | "decimal" }) => (
    <div className="field">
      <L k={k} req={req}>{label}</L>
      <input id={`ci-${k}`} type={type} placeholder={ph} inputMode={mode} value={v[k] ?? ""} onChange={on(k)} />
    </div>
  );
  const S = ({ k, label, opts }: { k: string; label: string; opts: [string, string][] }) => (
    <div className="field">
      <L k={k}>{label}</L>
      <select id={`ci-${k}`} value={v[k] ?? ""} onChange={on(k)}>
        {opts.map(([val, txt]) => <option key={val} value={val}>{txt}</option>)}
      </select>
    </div>
  );

  async function enviar() {
    if (disabled) return setErr("Pré-visualização: o formulário só envia na página pública da proposta.");
    const falta = [!g("p_nome") && "nome completo", !g("p_cpf") && "CPF", !ok && "a confirmação de autorização"].filter(Boolean);
    if (falta.length) return setErr(`Falta preencher: ${falta.join(", ")}.`);
    if (file && file.size > 6 * 1024 * 1024) return setErr("O arquivo da matrícula deve ter até 6 MB.");
    setErr("");
    setSending(true);
    try {
      const body = {
        proprietario: { nome: g("p_nome"), cpf: g("p_cpf"), rg: g("p_rg"), nacionalidade: g("p_nac"), profissao: g("p_prof"), endereco: g("p_end"), telefone: g("p_tel"), email: g("p_email") },
        casamento: { estadoCivil: g("estado_civil"), data: g("c_data"), regime: g("c_regime"), matricula: g("c_matricula"), rcpn: g("c_rcpn"), municipio: g("c_municipio") },
        conjuge: { nome: g("j_nome"), cpf: g("j_cpf"), rg: g("j_rg"), nacionalidade: g("j_nac"), profissao: g("j_prof") },
        imovel: { areaHa: g("i_area"), zona: g("i_zona"), municipio: g("i_municipio"), cartorio: g("i_cartorio"), matriculas: g("i_matriculas"), car: g("i_car") },
        interesse: { modalidade: g("modalidade"), prazo: g("prazo"), reuniao: g("reuniao"), observacoes: g("obs") },
        local: g("i_municipio"),
        data: new Date().toISOString().slice(0, 10),
        matricula: file && file.size > 0 ? await readFile(file) : null,
      };
      const r = await fetch(`/api/public/${token}/carta`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Não foi possível enviar.");
      setProtocolo(d.protocolo);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const assinaturas: [string, string][] = [
    ["JBL Incorporadora Urbanismo e Empreendimentos Ltda", ""],
    [g("p_nome") || "Proprietário(a)", `CPF: n.º ${g("p_cpf")}`],
    ...(g("j_nome") ? [[g("j_nome"), `CPF: n.º ${g("j_cpf")}`] as [string, string]] : []),
  ];

  return (
    <div className="intent-grid">
      <form noValidate onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <fieldset className="group"><legend><i>01</i><E k="form.grupo1b">Dados do proprietário</E></legend>
          {I({ k: "p_nome", label: "Nome completo", req: true })}
          <div className="row2">{I({ k: "p_cpf", label: "CPF", req: true, ph: "000.000.000-00", mode: "numeric" })}{I({ k: "p_rg", label: "RG" })}</div>
          <div className="row2">{I({ k: "p_nac", label: "Nacionalidade", ph: "Brasileira" })}{I({ k: "p_prof", label: "Profissão" })}</div>
          {I({ k: "p_end", label: "Endereço residencial (rua, número, bairro, cidade/UF)" })}
          <div className="row2">{I({ k: "p_email", label: "E-mail", type: "email" })}{I({ k: "p_tel", label: "Telefone com DDD", type: "tel", ph: "(18) 99999-9999" })}</div>
          <div className="row2">
            {S({ k: "estado_civil", label: "Estado civil", opts: [["", "Selecione"], ...["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)"].map((x) => [x, x] as [string, string])] })}
            {S({ k: "modalidade", label: "Modalidade de interesse", opts: [["quero avaliar as opções", "Quero avaliar as opções"], ["parceria financeira", "Parceria financeira (dinheiro)"], ["parceria em lotes", "Parceria em lotes"], ["parceria híbrida", "Parceria híbrida (lotes + dinheiro)"]] })}
          </div>
          {S({ k: "prazo", label: "Prazo de vendas que mais interessa", opts: [["a definir em reunião", "Ainda não sei"], ...[3, 5, 8, 10, 13, 15, 18, 20].map((a) => [`${a} anos (${a * 12} meses)`, `${a} anos`] as [string, string])] })}
        </fieldset>

        <fieldset className="group"><legend><i>02</i><E k="form.grupo2b">Informações matrimoniais e cônjuge</E></legend>
          <small className="muted"><E k="form.grupo2nota">Preencha quando aplicável. Todos os campos permanecem visíveis para facilitar a conferência.</E></small>
          <div className="row2">
            {I({ k: "c_data", label: "Data do casamento", type: "date" })}
            {S({ k: "c_regime", label: "Regime de bens", opts: [["", "Selecione"], ...["Comunhão parcial de bens", "Comunhão universal de bens", "Separação total de bens", "Separação obrigatória de bens", "Participação final nos aquestos"].map((x) => [x, x] as [string, string])] })}
          </div>
          <div className="row2">{I({ k: "c_matricula", label: "Matrícula da certidão de casamento" })}{I({ k: "c_rcpn", label: "RCPN / cartório do registro civil" })}</div>
          {I({ k: "c_municipio", label: "Município / comarca do casamento" })}
          {I({ k: "j_nome", label: "Nome completo do cônjuge" })}
          <div className="row2">{I({ k: "j_cpf", label: "CPF do cônjuge", mode: "numeric" })}{I({ k: "j_rg", label: "RG do cônjuge" })}</div>
          <div className="row2">{I({ k: "j_nac", label: "Nacionalidade do cônjuge" })}{I({ k: "j_prof", label: "Profissão do cônjuge" })}</div>
        </fieldset>

        <fieldset className="group"><legend><i>03</i><E k="form.grupo3b">Dados do imóvel</E></legend>
          <div className="row2">{I({ k: "i_area", label: "Área total em hectares", mode: "decimal" })}{I({ k: "i_zona", label: "Zona / localização" })}</div>
          <div className="row2">{I({ k: "i_municipio", label: "Município / UF" })}{I({ k: "i_matriculas", label: "Matrícula(s) do imóvel" })}</div>
          <div className="row2">{I({ k: "i_cartorio", label: "Cartório de Registro de Imóveis" })}{I({ k: "i_car", label: "CAR, quando aplicável" })}</div>
          <div className="field">
            <L k="arquivo">Matrícula atualizada (opcional neste primeiro envio)</L>
            <input id="ci-arquivo" type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <small><E k="form.arquivoNota">PDF, PNG ou JPEG, até 6 MB. O arquivo segue junto com a carta para a JBL.</E></small>
          </div>
          <div className="field"><L k="obs">Observações</L><textarea id="ci-obs" value={v.obs ?? ""} onChange={on("obs")} /></div>
          {I({ k: "reuniao", label: "Melhor dia/horário para uma reunião" })}
        </fieldset>

        <div className="declara"><E k="form.declaracao2" html>{"<strong>Declaração.</strong> Declaro que desejo dar continuidade aos estudos de viabilidade técnica, jurídica, ambiental, comercial e econômica da gleba informada e à elaboração da carta de intenção com a JBL Incorporadora e Urbanismo."}</E></div>
        <label className="opt"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><E k="form.confirmo">Confirmo que tenho autorização para fornecer os dados informados e estou ciente de que eles serão registrados para análise, e de que esta é uma manifestação de interesse, não um contrato nem uma transferência do imóvel.</E></label>
        {err && <p className="err">{err}</p>}

        {protocolo ? (
          <div className="protocol">
            <span className="muted" style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Seu protocolo</span>
            <span className="code">{protocolo}</span>
            <p style={{ fontSize: 16 }}><E k="form.recebida">Carta de intenção recebida. A equipe da JBL entrará em contato para os próximos passos.</E></p>
            <div className="actions"><button type="button" className="dl dl-navy" onClick={() => window.print()}>Baixar / salvar como PDF</button></div>
          </div>
        ) : (
          <>
            <div className="actions">
              <button type="submit" className="dl dl-gold" disabled={sending}>{sending ? "Enviando…" : <E k="form.enviar2">Enviar intenção e gerar protocolo ↗</E>}</button>
              <button type="button" className="dl dl-navy" onClick={() => window.print()}><E k="form.salvarPdf">Baixar / salvar como PDF</E></button>
            </div>
            <p className="note"><E k="form.confira">Confira os dados antes de enviar. Nenhum campo é salvo apenas por digitar.</E></p>
          </>
        )}
      </form>

      <div className="preview" aria-live="polite">
        <h3>{TITULO}</h3>
        {paragrafos(v, project).map((p, i) => (p.h ? <p key={i} className="ci-h"><Texto partes={p.partes} /></p> : <p key={i}><Texto partes={p.partes} /></p>))}
        {assinaturas.map(([n, s], i) => (
          <div key={i} className="sig"><strong>{n}</strong>{s && <><br /><small>{s}</small></>}</div>
        ))}
      </div>
    </div>
  );
}
