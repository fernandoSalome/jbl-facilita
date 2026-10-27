"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  // o que foi digitado fica guardado neste aparelho: dá para sair e voltar depois para enviar
  const chave = `jbl-carta:${token}`;
  const [lido, setLido] = useState(false);
  useEffect(() => {
    if (disabled) return;
    try {
      const salvo = JSON.parse(localStorage.getItem(chave) ?? "null") as { campos?: Campos; aceite?: boolean; protocolo?: string } | null;
      if (salvo?.campos) setV((o) => ({ ...o, ...salvo.campos }));
      if (salvo?.aceite) setAceite(true);
      if (salvo?.protocolo) setProtocolo(salvo.protocolo);
    } catch {
      // sem acesso ao armazenamento do navegador: segue sem rascunho
    }
    setLido(true);
  }, [chave, disabled]);
  useEffect(() => {
    if (disabled || !lido) return;
    try {
      localStorage.setItem(chave, JSON.stringify({ campos: v, aceite, protocolo: protocolo || undefined }));
    } catch {
      // armazenamento cheio ou bloqueado
    }
  }, [v, aceite, protocolo, lido, chave, disabled]);
  const g = (k: string) => (v[k] ?? "").trim();
  const on = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const m = MASCARAS[k];
    const val = m ? mascarar(e.target.value, m) : e.target.value;
    setV((o) => ({ ...o, [k]: val }));
  };

  const L = ({ k, children }: { k: string; children: string }) => (
    // nenhum campo é obrigatório: o * não aparece
    <label htmlFor={`ci-${k}`}><E k={`form.${k}`}>{children}</E></label>
  );
  const I = ({ k, label, type = "text", ph, mode }: { k: string; label: string; type?: string; ph?: string; mode?: "numeric" | "decimal" }) => (
    <div className="field">
      <L k={k}>{label}</L>
      <input id={`ci-${k}`} type={type} inputMode={mode} value={v[k] ?? ""} onChange={on(k)} />
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

  // começou a preencher: avisa a equipe no grupo do WhatsApp (uma vez por visita; o servidor também evita repetir)
  const avisouInicio = useRef(false);
  function comecou() {
    if (disabled || avisouInicio.current || protocolo) return;
    avisouInicio.current = true;
    fetch(`/api/public/${token}/carta/inicio`, { method: "POST", keepalive: true }).catch(() => {});
  }
  const [festa, setFesta] = useState(false);

  async function enviar() {
    if (disabled) return setErr("Pré-visualização: o formulário só envia na página pública da proposta.");
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
      setFesta(true);
      // a carta enviada fica à vista no lugar do formulário
      requestAnimationFrame(() => document.getElementById("intencao")?.scrollIntoView({ behavior: "smooth", block: "start" }));
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

  const carta = (
    <div className="preview" aria-live="polite">
      <h3>{TITULO}</h3>
      {paragrafos(v, project).map((p, i) => (p.h ? <p key={i} className="ci-h"><Texto partes={p.partes} /></p> : <p key={i}><Texto partes={p.partes} /></p>))}
      {assinaturas.map(([n, s], i) => (
        <div key={i} className="sig"><strong>{n}</strong>{s && <><br /><small>{s}</small></>}</div>
      ))}
    </div>
  );

  // enviada: o formulário some; fica a carta preenchida e o aviso de que os dados foram enviados
  if (protocolo) {
    return (
      <div className="intent-grid intent-enviada">
        {festa && <Comemoracao nome={g("p_nome").split(/\s+/)[0] ?? ""} fim={() => setFesta(false)} />}
        <div className="protocol">
          <span className="muted" style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Dados enviados · protocolo</span>
          <span className="code">{protocolo}</span>
          <p style={{ fontSize: 16 }}><E k="form.recebida">Carta de intenção recebida. A equipe da JBL entrará em contato para os próximos passos.</E></p>
        </div>
        {carta}
        {contatos && <div className="intent-contatos">{contatos}</div>}
      </div>
    );
  }

  return (
    <div className="intent-grid">
      <form noValidate onFocus={comecou} onInput={comecou} onSubmit={(e) => { e.preventDefault(); enviar(); }}>
        <fieldset className="group"><legend><i>01</i><E k="form.grupo1b">Dados do proprietário</E></legend>
          {I({ k: "p_nome", label: "Nome completo" })}
          <div className="row2">{I({ k: "p_cpf", label: "CPF", mode: "numeric" })}{I({ k: "p_rg", label: "RG" })}</div>
          <div className="row2">{I({ k: "p_nac", label: "Nacionalidade" })}{I({ k: "p_prof", label: "Profissão" })}</div>
          {I({ k: "p_end", label: "Endereço residencial (rua, número, bairro, cidade/UF)" })}
          <div className="row2">{I({ k: "p_email", label: "E-mail", type: "email" })}<div className="field">
            <L k="p_tel">Telefone com DDD</L>
            <input id="ci-p_tel" type="tel" value={v.p_tel ?? ""} onChange={on("p_tel")} />
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
        <div className="lgpd">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
          <span><E k="form.lgpd" html>{"<strong>Proteção dos seus dados (LGPD).</strong> Asseguramos o sigilo das informações enviadas, tratadas conforme a Lei Geral de Proteção de Dados (Lei n.º 13.709/2018). Os dados serão usados somente para a análise da área e a elaboração da carta de intenção, com acesso restrito à equipe responsável da JBL. A qualquer momento você pode pedir a consulta, a correção ou a exclusão dos seus dados."}</E></span>
        </div>
        <label className="aceite">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span><E k="form.aceite">Confirmo que tenho autorização para fornecer os dados informados e estou ciente de que eles serão registrados para análise, e de que esta é uma manifestação de interesse, não um contrato nem uma transferência do imóvel.</E></span>
        </label>
        {err && <p className="err">{err}</p>}

        <div className="actions">
          <button type="submit" className="dl dl-gold" disabled={sending}>{sending ? "Enviando…" : <E k="form.enviar2">Enviar intenção e gerar protocolo ↗</E>}</button>
        </div>
        <p className="note intent-registro"><E k="txt.intentAside2">Os dados serão registrados neste sistema, com protocolo e acesso restrito ao responsável pelo site. Não haverá disparo automático de e-mail ou WhatsApp.</E></p>
      </form>

      {carta}
      {contatos && <div className="intent-contatos">{contatos}</div>}
    </div>
  );
}

/**
 * Comemoração do envio: estouro de confetes na tela e uma mensagem de parabéns que some sozinha
 * (clique fecha antes). Com "reduzir movimento" ligado no aparelho, só a mensagem.
 */
function Comemoracao({ nome, fim }: { nome: string; fim: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null);
  const [sumindo, setSumindo] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setSumindo(true), 5200);
    const t2 = setTimeout(fim, 6000);
    const c = tela.current;
    const ctx = c?.getContext("2d");
    const calmo = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let quadro = 0;
    if (c && ctx && !calmo) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth, H = window.innerHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      ctx.scale(dpr, dpr);
      const cores = ["#C1943D", "#E7C26A", "#122A45", "#2E6DB4", "#F5F1E6", "#22A06B", "#E4572E"];
      // três estouros: centro e as duas laterais
      const origens = [[W / 2, H * 0.55], [W * 0.18, H * 0.75], [W * 0.82, H * 0.75]];
      const pecas = origens.flatMap(([ox, oy], k) =>
        Array.from({ length: k === 0 ? 170 : 90 }, () => {
          const ang = k === 0 ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - 0.5) * 1.4 + (k === 1 ? 0.35 : -0.35);
          // em tela pequena os confetes andam mais devagar (senão saem da tela num instante)
          const vel = ((k === 0 ? 7 : 11) + Math.random() * 9) * Math.max(0.5, Math.min(1, W / 1000));
          return { x: ox, y: oy, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - (k === 0 ? 4 : 2), g: 0.22 + Math.random() * 0.12, w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.35, cor: cores[(Math.random() * cores.length) | 0], vida: 1 };
        }),
      );
      const inicio = performance.now();
      const passo = (t: number) => {
        ctx.clearRect(0, 0, W, H);
        const idade = (t - inicio) / 1000;
        for (const p of pecas) {
          p.vx *= 0.985;
          p.vy = p.vy * 0.985 + p.g;
          p.x += p.vx;
          p.y += p.vy;
          p.r += p.vr;
          p.vida = Math.max(0, 1 - Math.max(0, idade - 2.6) / 1.4);
          ctx.save();
          ctx.globalAlpha = p.vida;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.cor;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
          ctx.restore();
        }
        if (idade < 4.2) quadro = requestAnimationFrame(passo);
        else ctx.clearRect(0, 0, W, H);
      };
      quadro = requestAnimationFrame(passo);
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      cancelAnimationFrame(quadro);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // fora da página da proposta (direto no body): fica por cima de tudo, mesmo com seções animadas
  return createPortal(
    <div className={`festa ${sumindo ? "sumindo" : ""}`} onClick={fim} role="status" aria-live="assertive">
      <canvas ref={tela} className="festa-confete" aria-hidden="true" />
      <div className="festa-msg">
        <div className="festa-ic" aria-hidden="true">🎉</div>
        <strong>{nome ? `Parabéns, ${nome}!` : "Parabéns!"}</strong>
        <p>Sua carta de intenção foi enviada com sucesso. Este é o primeiro passo de uma grande parceria.</p>
        <p>A JBL vai estar sempre ao seu lado para apoiar você em cada etapa.</p>
      </div>
    </div>,
    document.body,
  );
}
