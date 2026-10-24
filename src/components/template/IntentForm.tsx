"use client";

import { Fragment, useState } from "react";
import { fmtNum } from "@/lib/format";
import { E } from "./Editable";
import { CPF, mascarar, RG } from "@/lib/mascara";
import { paragrafos, TITULO, type Campos, type Parte, type Projeto } from "@/lib/carta";

/**
 * Carta de intenção: formulário no layout do site da proposta (campos à esquerda,
 * carta montando sozinha à direita). O envio continua indo para o servidor e
 * aparece como "Assinada" na lista de propostas.
 */

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

const MASCARAS: Record<string, string | ((digitos: string) => string)> = {
  p_cpf: CPF,
  j_cpf: CPF,
  p_rg: RG,
  j_rg: RG,
  // celular com 9 dígitos ou fixo com 8 (Brasil); o formato dos EUA vem da bandeira escolhida
  p_tel: (d) => (d.length > 10 ? "00 00000-0000" : "00 0000-0000"),
};

function readFile(file: File): Promise<{ name: string; type: string; data: string }> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res({ name: file.name, type: file.type, data: String(fr.result) });
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export default function IntentForm({
  token,
  disabled,
  project,
  areaHa,
  contatos,
}: {
  token: string;
  disabled: boolean;
  project: Projeto;
  areaHa: number;
  /** Contatos exclusivos: embaixo do formulário no computador, embaixo da carta no celular */
  contatos?: React.ReactNode;
}) {
  const [v, setV] = useState<Campos>(() => ({
    i_area: fmtNum(areaHa, 4),
    i_municipio: `${project.municipio}/${project.uf}`,
    i_matriculas: project.matricula ?? "",
  }));
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const [aceite, setAceite] = useState(false);
  const g = (k: string) => (v[k] ?? "").trim();
  // telefone: bandeira 🇧🇷 (00 00000-0000) ou 🇺🇸 (+0 000 000 0000)
  const paisTel = v.p_tel_pais === "us" ? "us" : "br";
  const MASC_US = "+0 000 000 0000";
  const trocarPais = (p: "br" | "us") =>
    setV((o) => ({ ...o, p_tel_pais: p, p_tel: o.p_tel ? mascarar(o.p_tel, p === "us" ? MASC_US : MASCARAS.p_tel) : "" }));
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const m = k === "p_tel" && paisTel === "us" ? MASC_US : MASCARAS[k];
    const val = m ? mascarar(e.target.value, m) : e.target.value;
    setV((o) => ({ ...o, [k]: val }));
  };

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
    const falta = [!g("p_nome") && "nome completo", !g("p_cpf") && "CPF"].filter(Boolean);
    if (falta.length) return setErr(`Falta preencher: ${falta.join(", ")}.`);
    if (!aceite) return setErr("Marque a confirmação antes de enviar.");
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
        aceite: true,
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
          <div className="row2">{I({ k: "p_cpf", label: "CPF", req: true, ph: "000.000.000-00", mode: "numeric" })}{I({ k: "p_rg", label: "RG", ph: RG })}</div>
          <div className="row2">{I({ k: "p_nac", label: "Nacionalidade", ph: "Brasileira" })}{I({ k: "p_prof", label: "Profissão" })}</div>
          {I({ k: "p_end", label: "Endereço residencial (rua, número, bairro, cidade/UF)" })}
          <div className="row2">{I({ k: "p_email", label: "E-mail", type: "email" })}<div className="field">
            <L k="p_tel">Telefone com DDD</L>
            <div className="tel-wrap">
              <select aria-label="País do telefone" value={paisTel} onChange={(e) => trocarPais(e.target.value as "br" | "us")}>
                <option value="br">🇧🇷 Brasil</option>
                <option value="us">🇺🇸 EUA</option>
              </select>
              <input id="ci-p_tel" type="tel" inputMode="numeric" placeholder={paisTel === "us" ? "+1 555 123 4567" : "18 99999-9999"} value={v.p_tel ?? ""} onChange={on("p_tel")} />
            </div>
          </div></div>
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
          <div className="row2">{I({ k: "j_cpf", label: "CPF do cônjuge", ph: CPF, mode: "numeric" })}{I({ k: "j_rg", label: "RG do cônjuge", ph: RG })}</div>
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
        <div className="lgpd">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <span><E k="form.lgpd" html>{"<strong>Proteção dos seus dados (LGPD).</strong> Asseguramos o sigilo das informações enviadas, tratadas conforme a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018). Os dados serão usados somente para a análise da área e a elaboração da carta de intenção, com acesso restrito à equipe responsável da JBL. A qualquer momento você pode pedir a consulta, a correção ou a exclusão dos seus dados."}</E></span>
        </div>
        <label className="aceite">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span><E k="form.aceite">Confirmo que tenho autorização para fornecer os dados informados e estou ciente de que eles serão registrados para análise, e de que esta é uma manifestação de interesse, não um contrato nem uma transferência do imóvel.</E></span>
        </label>
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
      {contatos && <div className="intent-contatos">{contatos}</div>}
    </div>
  );
}
