/**
 * Texto da carta de intenção (o mesmo do site da proposta), montado com os dados do projeto
 * e os campos preenchidos. Usado no formulário (prévia ao vivo) e na carta recebida pela JBL.
 */

export type Campos = Record<string, string>;
export type Projeto = { name: string; municipio: string; uf: string; matricula: string | null };

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const hoje = (d = new Date()) => {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const fmtData = (s: string) => (s ? s.split("-").reverse().join("/") : "");
const low = (s: string) => s.toLowerCase();
export const TITULO = "CARTA DE INTENÇÃO - PARCERIA IMOBILIÁRIA";

export type Parte = string | { blank: string } | { b: string };
export type Paragrafo = { h?: boolean; partes: Parte[] };

/** Texto da carta (mesmo do site), com os dados do projeto e os campos preenchidos */
export function paragrafos(v: Campos, p: Projeto, data?: Date): Paragrafo[] {
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
  out.push(P(`${mun.split(/[/-]/)[0].trim()}, ${hoje(data)}.`));
  return out;
}

