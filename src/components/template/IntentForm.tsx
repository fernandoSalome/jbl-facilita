"use client";

import { useState } from "react";
import { fmtNum } from "@/lib/format";
import { E } from "./Editable";

/** Termo de aceite para carta de intenção (pág. 27 do PDF), em formulário. */

function F({ name, label, type = "text", required, defaultValue, wide }: { name: string; label: string; type?: string; required?: boolean; defaultValue?: string; wide?: boolean }) {
  return (
    <div className="field" style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <label htmlFor={name}><E k={`form.${name}`}>{label}</E>{required && <span style={{ color: "var(--gold)" }}> *</span>}</label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue} />
    </div>
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

export default function IntentForm({
  token,
  disabled,
  project,
  areaHa,
}: {
  token: string;
  disabled: boolean;
  project: { municipio: string; uf: string; matricula: string | null };
  areaHa: number;
}) {
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [protocolo, setProtocolo] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    setErr("");
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "").trim();
    const file = fd.get("arquivo") as File | null;
    if (file && file.size > 6 * 1024 * 1024) return setErr("O arquivo da matrícula deve ter até 6 MB.");
    setSending(true);
    try {
      const body = {
        proprietario: { nome: g("p_nome"), cpf: g("p_cpf"), rg: g("p_rg"), nacionalidade: g("p_nac"), profissao: g("p_prof"), telefone: g("p_tel"), email: g("p_email") },
        casamento: { estadoCivil: g("estado_civil"), data: g("c_data"), regime: g("c_regime"), matricula: g("c_matricula"), rcpn: g("c_rcpn"), municipio: g("c_municipio"), observacoes: g("c_obs") },
        conjuge: { nome: g("j_nome"), cpf: g("j_cpf"), rg: g("j_rg"), nacionalidade: g("j_nac"), profissao: g("j_prof") },
        imovel: { areaHa: g("i_area"), zona: g("i_zona"), municipio: g("i_municipio"), cartorio: g("i_cartorio"), matriculas: g("i_matriculas"), car: g("i_car") },
        local: g("local"),
        data: g("data"),
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

  if (protocolo) {
    return (
      <div className="protocol">
        <div className="eyebrow">Carta de intenção recebida</div>
        <div className="code">{protocolo}</div>
        <p>Obrigado! Guardem este número de protocolo. A equipe da JBL entrará em contato para os próximos passos.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      {disabled && <div className="declara">Pré-visualização: o formulário só envia na página pública da proposta.</div>}
      <fieldset className="group">
        <legend><i>1</i><E k="form.grupo1">Dados do proprietário</E></legend>
        <div className="row">
          <F name="p_nome" label="Nome completo" required wide />
          <F name="p_cpf" label="CPF" required />
          <F name="p_rg" label="RG" />
          <F name="p_nac" label="Nacionalidade" defaultValue="Brasileira" />
          <F name="p_prof" label="Profissão" />
          <F name="p_tel" label="Telefone / WhatsApp" type="tel" />
          <F name="p_email" label="E-mail" type="email" />
        </div>
      </fieldset>
      <fieldset className="group">
        <legend><i>2</i><E k="form.grupo2">Informações matrimoniais</E></legend>
        <div className="row">
          <div className="field">
            <label htmlFor="estado_civil"><E k="form.estado_civil">Estado civil</E></label>
            <select id="estado_civil" name="estado_civil" defaultValue="">
              <option value="">Selecione</option>
              <option>Solteiro(a)</option><option>Casado(a)</option><option>União estável</option><option>Divorciado(a)</option><option>Viúvo(a)</option>
            </select>
          </div>
          <F name="c_data" label="Data do casamento" type="date" />
          <div className="field">
            <label htmlFor="c_regime"><E k="form.c_regime">Regime de bens</E></label>
            <select id="c_regime" name="c_regime" defaultValue="">
              <option value="">Selecione</option>
              <option>Comunhão parcial de bens</option><option>Comunhão universal de bens</option><option>Separação total de bens</option><option>Participação final nos aquestos</option>
            </select>
          </div>
          <F name="c_matricula" label="Matrícula (certidão)" />
          <F name="c_rcpn" label="RCPN" />
          <F name="c_municipio" label="Município / comarca" />
          <F name="c_obs" label="Observações" wide />
        </div>
      </fieldset>
      <fieldset className="group">
        <legend><i>3</i><E k="form.grupo3">Dados do cônjuge</E></legend>
        <div className="row">
          <F name="j_nome" label="Nome completo" wide />
          <F name="j_cpf" label="CPF" />
          <F name="j_rg" label="RG" />
          <F name="j_nac" label="Nacionalidade" />
          <F name="j_prof" label="Profissão" />
        </div>
      </fieldset>
      <fieldset className="group">
        <legend><i>4</i><E k="form.grupo4">Dados do imóvel</E></legend>
        <div className="row">
          <F name="i_area" label="Área total (ha)" defaultValue={fmtNum(areaHa, 4)} />
          <F name="i_zona" label="Zona" />
          <F name="i_municipio" label="Município do imóvel" defaultValue={`${project.municipio} - ${project.uf}`} />
          <F name="i_cartorio" label="Cartório de Registro de Imóveis" wide />
          <F name="i_matriculas" label="Matrícula(s) do imóvel" defaultValue={project.matricula ?? ""} />
          <F name="i_car" label="CAR(s)" />
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="arquivo"><E k="form.arquivo">Cópia da matrícula atualizada (PDF ou foto)</E></label>
            <input id="arquivo" name="arquivo" type="file" accept=".pdf,image/*" />
          </div>
          <F name="local" label="Local" />
          <F name="data" label="Data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </fieldset>
      <label className="declara">
        <input type="checkbox" required style={{ marginTop: 4 }} />
        <span><E k="form.declaracao">Declaramos nosso consentimento para a elaboração da Carta de Intenção e nos comprometemos a fornecer as informações e documentos solicitados, a fim de possibilitar à JBL Incorporadora e Urbanismo o prosseguimento dos estudos de viabilidade do empreendimento.</E></span>
      </label>
      {err && <p className="err">{err}</p>}
      <div><button className="intent-btn" disabled={sending}>{sending ? "Enviando…" : <E k="form.enviar">Enviar carta de intenção</E>}</button></div>
    </form>
  );
}
