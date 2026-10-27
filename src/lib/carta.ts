/**
 * Texto da carta de intenção (o mesmo do site da proposta e da minuta).
 * Cada parágrafo é um texto editável (no template vale para todas as propostas; na proposta, só nela)
 * com os dados do formulário como campos {{nome}}: na tela viram blocos travados, preenchidos
 * com o que a pessoa digitou. O texto em volta pode ser mudado à vontade.
 */
import { HTML_PREFIX, sanitizeHtml } from "./sanitize";

export type Campos = Record<string, string>;
export type Projeto = { name: string; municipio: string; uf: string; matricula: string | null };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const extenso = (d = new Date()) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
const fmtData = (s: string) => (s ? s.split("-").reverse().join("/") : "");
const low = (s: string) => s.toLowerCase();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export const TITULO = "CARTA DE INTENÇÃO - PARCERIA IMOBILIÁRIA";
/** Dados da empresa na carta (do modelo oficial "JBL_MINUTA CARTA DE INTENCAO") */
export const CNPJ_JBL = "58.521.773/0001-01";

/** Valor de campo que já vem em HTML (negrito, lacunas): o editor coloca sem escapar */
export const VAR_HTML = "\u0001";

/** Parágrafos da carta: chave do texto editável, se é título de seção e o texto padrão (HTML com {{campos}}) */
export type BlocoCarta = { k: string; h?: boolean; texto: string };

export const BLOCOS_CARTA: BlocoCarta[] = [
  { k: "carta.intro", texto: "Ambas as partes reconhecem que esta carta de intenção de parceria não cria uma obrigação legal vinculativa entre elas. No entanto, caso as partes concordem em estabelecer uma parceria formal no futuro, esta carta será usada como base para as negociações e elaboração de um contrato formal. As partes reconhecem que podem desistir desta intenção de parceria a qualquer momento, respeitado o prazo de estudo de viabilidade, e antes da celebração de um contrato formal por meio de uma comunicação por escrito, sem qualquer penalidade ou responsabilidade perante a outra parte." },
  {
    k: "carta.partes",
    texto:
      `<strong>JBL INCORPORADORA URBANISMO E EMPREENDIMENTOS LTDA,</strong> pessoa jurídica de direito privado, com nome fantasia, <strong>GRUPO JBL INCORPORADORA E URBANISMO</strong>, inscrita no CNPJ sob n.º ${CNPJ_JBL}, com sede jurídica na Rua Ribeirão Claro, 655 – Bairro: Vila Olímpia, São Paulo/SP – CEP: 04549-060, representada neste ato pelo sócio administrador, Felipe Stampini Oliveira Lopes, brasileiro, solteiro, engenheiro civil, portador do CPF: n.º 104.945.466-97 e n.º do documento de identidade: CNH: n.º 05625886555 - Órgão Emissor: SNT/MG, nascido em 20/9/1993, natural da cidade de Visconde do Rio Branco/MG, doravante <strong>DENOMINADA EMPREENDEDORA PROPONENTE</strong>, propõe nos termos a seguir, a presente carta de intenção, para formalização de uma parceria imobiliária com <strong>{{p_nome_maiusc}}</strong>{{qualificacao}}{{casamento}}, residente(s) e domiciliado(s) na {{p_end}}, <strong>DENOMINADOS PROPRIETÁRIOS TERRENISTAS - COTISTA</strong>.`,
  },
  { k: "carta.h1", h: true, texto: "I – DA EMPRESA PROPONENTE" },
  { k: "carta.i1", texto: "A empresa <strong>PROPONENTE</strong>, pessoa jurídica de direito privado, com nome fantasia, <strong>GRUPO JBL INCORPORADORA E URBANISMO</strong>, com atividade principal de incorporação de empreendimentos imobiliários, tendo experiência na implantação de Parcelamentos de Solos Urbano e Rural." },
  { k: "carta.i2", texto: "Atua no mercado imobiliário implantando empreendimentos de loteamentos e condomínios em todo o território nacional." },
  { k: "carta.h2", h: true, texto: "II – DO PARCEIRO – PROPRIETÁRIOS TERRENISTAS - COTISTAS" },
  { k: "carta.ii", texto: "<strong>OS PROPRIETÁRIOS</strong> acima qualificados são legítimos proprietários e possuidores do imóvel rural com área total de {{i_area}} hectares, situado {{situado}}, Município e Comarca de {{i_municipio}}, registrados no {{i_cartorio}}, na matrícula n.º {{i_matriculas}}{{car}}." },
  { k: "carta.h3", h: true, texto: "III – A EMPREENDEDORA PROPONENTE" },
  { k: "carta.iii1", texto: "Por meio desta carta de intenção, propõe a <strong>EMPREENDEDORA PROPONENTE</strong> firmar uma eventual parceria imobiliária com a <strong>PROPRIETÁRIA TERRENISTA-COTISTA</strong>, em que este figurará como <strong>PARCEIRO PROPRIETÁRIO</strong>, enquanto aquela figurará como <strong>PARCEIRA EMPREENDEDORA</strong>." },
  { k: "carta.iii2", texto: "O <strong>PARCEIRO PROPRIETÁRIO TERRENISTA-COTISTA</strong> disponibilizará o imóvel para a <strong>REALIZAÇÃO</strong> de loteamento aberto de lotes residencial, industrial e chacreamento, ou seja, o que o estudo preliminar mostrou." },
  { k: "carta.h4", h: true, texto: "IV – OS RESULTADOS" },
  { k: "carta.iv", texto: "Os resultados auferidos na eventual parceria serão distribuídos nos percentuais fixados entre as partes no contrato de parceria, que será firmado por via da formalização de uma <strong>sociedade de propósito específico (SPE)</strong>, na forma da lei." },
  { k: "carta.h5", h: true, texto: "V – PRAZO PARA O ESTUDO DE VIABILIDADE" },
  { k: "carta.v1", texto: "Fixa-se o prazo de 30 (trinta) dias corridos para o complemento dos estudos necessários de viabilidade, bem como para as seguintes ações, independentemente de ordem cronológica, <strong>dentre outras</strong>, cujos gastos serão da <strong>PARCEIRA EMPREENDEDORA:</strong><br>a) transformação da área rural para urbana, de expansão urbana ou de urbanização específica;<br>b) eventual organização das matrículas (desmembramento, remembramento);<br>c) aprovação pelo município, se necessária, da lei de loteamento de lotes e;<br>d) reformulação do projeto urbanístico a pedido do Município etc." },
  { k: "carta.v2", texto: "<strong>Dentro do prazo acima, bem como da prorrogação, os PROPRIETÁRIOS se comprometem a não oferecer a área para outro empreendedor.</strong>" },
  { k: "carta.v3", texto: "O prazo acima estipulado pode ser prorrogado por interesse das partes, por igual prazo de 30 (trinta) dias, quando assinarão um termo aditivo." },
  { k: "carta.h6", h: true, texto: "VI – EM CASO DE INVIABILIDADE" },
  { k: "carta.vi", texto: "Na hipótese de se verificar a <strong>INVIABILIDADE</strong> do projeto pela <strong>PARCEIRA EMPREENDEDORA</strong>, o presente acordo será extinto sem quaisquer ônus para as Partes, e sem que haja a obrigatoriedade da apresentação dos estudos pelo Parceiro Empreendedor." },
  { k: "carta.h7", h: true, texto: "VII – EM CASO DE VIABILIDADE" },
  { k: "carta.vii1", texto: "Uma vez constatada a <strong>VIABILIDADE</strong> do projeto, a <strong>PROPONENTE EMPREENDEDORA</strong> apresentará aos <strong>PROPRIETÁRIOS</strong> uma proposta definitiva da minuta da SPE, que deverá ser livremente analisada, na qual estará prevista a responsabilidade da <strong>EMPREENDEDORA</strong> de aportar os recursos técnicos e financeiros e disponibilizar a sua estrutura e expertise para viabilização e execução e término do <strong>projeto de loteamento</strong> na área acima descrita, com a infraestrutura completa exigida pelo município." },
  { k: "carta.vii2", texto: "Nesta hipótese de viabilidade do projeto, e enquanto não assinada a Parceria por intermédio da SPE, a <strong>PROPONENTE EMPREENDEDORA</strong> também não se obriga a apresentar os projetos/estudos realizados até então." },
  { k: "carta.local", texto: "{{cidade}}, {{data}}." },
];

/** Campos que dá para colocar no texto (os mesmos do formulário ao lado), por grupo */
export const CAMPOS_CARTA: { grupo: string; campos: [campo: string, rotulo: string][] }[] = [
  {
    grupo: "Dados do proprietário",
    campos: [
      ["p_nome_maiusc", "Nome completo (MAIÚSCULAS)"], ["p_nome", "Nome completo"], ["p_cpf", "CPF"], ["p_rg", "RG"], ["p_nac", "Nacionalidade"], ["p_prof", "Profissão"],
      ["p_nasc", "Data de nascimento"], ["p_natural", "Natural de"], ["p_end", "Endereço residencial"], ["p_tel", "Telefone"], ["p_email", "E-mail"], ["estado_civil", "Estado civil"],
      ["qualificacao", "Qualificação completa (nacionalidade, profissão, RG, CPF, nascimento)"],
    ],
  },
  {
    grupo: "Casamento e cônjuge",
    campos: [
      ["c_data", "Data do casamento"], ["c_regime", "Regime de bens"], ["c_matricula", "Matrícula da certidão"], ["c_rcpn", "RCPN / cartório"], ["c_municipio", "Município do casamento"],
      ["j_nome_maiusc", "Nome do cônjuge (MAIÚSCULAS)"], ["j_nome", "Nome do cônjuge"], ["j_cpf", "CPF do cônjuge"], ["j_rg", "RG do cônjuge"], ["j_nac", "Nacionalidade do cônjuge"],
      ["j_prof", "Profissão do cônjuge"], ["j_nasc", "Nascimento do cônjuge"], ["j_natural", "Cônjuge natural de"],
      ["casamento", "Trecho do casamento e cônjuge (só aparece se casado ou em união estável)"],
    ],
  },
  {
    grupo: "Dados do imóvel",
    campos: [
      ["i_area", "Área total (ha)"], ["i_zona", "Zona / localização"], ["i_municipio", "Município / UF"], ["i_matriculas", "Matrícula(s)"], ["i_cartorio", "Cartório de Registro de Imóveis"],
      ["i_car", "Número do CAR"], ["car", "Trecho “, CAR n.º …” (só aparece se informado)"], ["gleba", "Nome da gleba"], ["situado", "Trecho “na Gleba …, zona”"],
    ],
  },
  { grupo: "Local e data", campos: [["cidade", "Cidade"], ["data", "Data por extenso"]] },
];

/**
 * Valor de cada campo, em HTML. Campo vazio vira uma lacuna destacada ([CPF]);
 * os trechos opcionais vazios ficam em branco (no editor aparecem com o nome, apagado).
 */
export function valoresCarta(v: Campos, p: Projeto, data?: Date): Record<string, string> {
  const g = (k: string) => (v[k] ?? "").trim();
  const lacuna = (ph: string) => `<span class="lacuna">[${esc(ph)}]</span>`;
  const f = (x: string, ph: string) => (x ? esc(x) : lacuna(ph));
  const opcional = (dica: string, html: string) => html || `<span class="var-vazia" data-rotulo="${esc(dica)}"></span>`;

  const nasc = (d: string, nat: string) => `${d ? `, nascido(a) em ${fmtData(d)}` : ""}${nat ? `, natural da cidade de ${esc(nat)}` : ""}`;
  const uniao = /uni/i.test(g("estado_civil"));
  const casado = /casad/i.test(g("estado_civil")) || (!g("estado_civil") && !!(g("j_nome") || g("c_data") || g("c_regime")));

  // qualificação: nacionalidade, estado civil (se não casado), profissão, RG, CPF, nascimento e naturalidade
  let q = `, ${g("p_nac") ? esc(low(g("p_nac"))) : "brasileiro(a)"}`;
  if (g("estado_civil") && !casado && !uniao) q += `, ${esc(low(g("estado_civil")))}`;
  if (g("p_prof")) q += `, ${esc(low(g("p_prof")))}`;
  q += `, RG: n.º ${f(g("p_rg"), "RG")}, CPF: n.º ${f(g("p_cpf"), "CPF")}${nasc(g("p_nasc"), g("p_natural"))}`;

  let c = "";
  if (casado || uniao) {
    c = (uniao ? ", em união estável" : ", casado(a)") + (g("c_data") ? ` em ${fmtData(g("c_data"))}` : "") + (g("c_regime") ? `, sob o regime de ${esc(low(g("c_regime")))} na vigência da Lei n.º 6.515/77` : "");
    if (g("c_matricula")) c += `, conforme certidão de casamento matriculada sob o n.º ${esc(g("c_matricula"))} do ${esc(g("c_rcpn") || "RCPN")}${g("c_municipio") ? ` da comarca de ${esc(g("c_municipio"))}` : ""}`;
    if (g("j_nome")) {
      c += `, com <strong>${esc(g("j_nome").toUpperCase())}</strong>`;
      c += `${g("j_nac") ? `, ${esc(low(g("j_nac")))}` : ""}${g("j_prof") ? `, ${esc(low(g("j_prof")))}` : ""}${g("j_rg") ? `, RG: n.º ${esc(g("j_rg"))}` : ""}${g("j_cpf") ? `, CPF: n.º ${esc(g("j_cpf"))}` : ""}${nasc(g("j_nasc"), g("j_natural"))}`;
    }
  }

  const mun = g("i_municipio") || `${p.municipio}/${p.uf}`;
  const nome = p.name.trim();
  // "Gleba", "Fazenda", "Sítio"... no começo do nome: não repete a palavra
  const situado = `${/^(gleba|fazenda|s[ií]tio|ch[aá]cara|est[aâ]ncia|lote|[áa]rea)\b/i.test(nome) ? `na ${esc(nome)}` : `na Gleba ${esc(nome)}`}${g("i_zona") ? `, ${esc(g("i_zona"))}` : ""}`;

  const val: Record<string, string> = {
    p_nome_maiusc: f(g("p_nome").toUpperCase(), "nome completo"),
    p_nome: f(g("p_nome"), "nome completo"),
    p_cpf: f(g("p_cpf"), "CPF"),
    p_rg: f(g("p_rg"), "RG"),
    p_nac: f(g("p_nac"), "nacionalidade"),
    p_prof: f(g("p_prof"), "profissão"),
    p_nasc: f(fmtData(g("p_nasc")), "data de nascimento"),
    p_natural: f(g("p_natural"), "naturalidade"),
    p_end: f(g("p_end"), "endereço"),
    p_tel: f(g("p_tel"), "telefone"),
    p_email: f(g("p_email"), "e-mail"),
    estado_civil: f(low(g("estado_civil")), "estado civil"),
    qualificacao: q,
    c_data: f(fmtData(g("c_data")), "data do casamento"),
    c_regime: f(low(g("c_regime")), "regime de bens"),
    c_matricula: f(g("c_matricula"), "matrícula da certidão"),
    c_rcpn: f(g("c_rcpn"), "RCPN"),
    c_municipio: f(g("c_municipio"), "município do casamento"),
    j_nome_maiusc: f(g("j_nome").toUpperCase(), "nome do cônjuge"),
    j_nome: f(g("j_nome"), "nome do cônjuge"),
    j_cpf: f(g("j_cpf"), "CPF do cônjuge"),
    j_rg: f(g("j_rg"), "RG do cônjuge"),
    j_nac: f(g("j_nac"), "nacionalidade do cônjuge"),
    j_prof: f(g("j_prof"), "profissão do cônjuge"),
    j_nasc: f(fmtData(g("j_nasc")), "nascimento do cônjuge"),
    j_natural: f(g("j_natural"), "naturalidade do cônjuge"),
    casamento: opcional("casamento e cônjuge, se houver", c),
    i_area: f(g("i_area"), "área"),
    i_zona: f(g("i_zona"), "zona"),
    i_municipio: esc(mun),
    i_matriculas: f(g("i_matriculas"), "matrícula"),
    i_cartorio: f(g("i_cartorio"), "Cartório de Registro de Imóveis"),
    i_car: f(g("i_car"), "CAR"),
    car: opcional("CAR, se houver", g("i_car") ? `, CAR n.º ${esc(g("i_car"))}` : ""),
    gleba: esc(nome),
    situado,
    cidade: esc(mun.split(/[/-]/)[0].trim()),
    data: extenso(data),
  };
  return val;
}

/** Os valores no formato do editor de textos da proposta (já em HTML) */
export function varsDoEditor(valores: Record<string, string>) {
  return Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, VAR_HTML + v]));
}

/** Texto em uso de um parágrafo (o editado, ou o padrão), em HTML com os {{campos}} */
export function modeloDoBloco(salvo: unknown, padrao: string) {
  if (typeof salvo !== "string" || !salvo.trim()) return padrao;
  if (salvo.startsWith(HTML_PREFIX)) return sanitizeHtml(salvo.slice(HTML_PREFIX.length));
  return esc(salvo).replace(/\n/g, "<br>");
}

/** Troca os {{campos}} pelos valores (campo desconhecido some) */
export function preencherCarta(modelo: string, valores: Record<string, string>) {
  return modelo.replace(/\{\{(\w+)\}\}/g, (_, n: string) => valores[n] ?? "");
}

/** Carta montada (título e parágrafos em HTML) com o texto em uso na proposta e os dados preenchidos */
export function cartaMontada(overrides: Record<string, unknown>, v: Campos, p: Projeto, data?: Date) {
  const valores = valoresCarta(v, p, data);
  return {
    titulo: typeof overrides["carta.titulo"] === "string" && (overrides["carta.titulo"] as string).trim() ? (overrides["carta.titulo"] as string).replace(/^html:/, "").replace(/<[^>]+>/g, "") : TITULO,
    blocos: BLOCOS_CARTA.map((b) => ({ h: !!b.h, html: preencherCarta(modeloDoBloco(overrides[b.k], b.texto), valores) })),
  };
}
