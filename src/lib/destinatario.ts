import type { Destinatario } from "./proposals";

/**
 * Formas de tratamento da proposta conforme o destinatário (duas opções):
 *   família → "Prezada Família Silva,", "a família recebe"
 *   pessoa  → "Prezado Sr. João," / "Prezada Sra. Maria,", "o Sr. João recebe"
 *             (sem nome: "Prezado Proprietário,", "o proprietário recebe")
 * Propostas antigas com "proprietário" ou "pessoa" sem Sr./Sra. viram "pessoa".
 * `pick(familia, pessoa)` escolhe a frase certa (um 3º argumento antigo é ignorado).
 */
export function tratamento(d?: Destinatario) {
  const tipo: "familia" | "pessoa" = !d?.tipo || d.tipo === "familia" ? "familia" : "pessoa";
  // "Sra. Bruna Stein" escrito no nome (propostas antigas): o Sr./Sra. vem da escolha, não do nome
  const bruto = (d?.nome ?? "").trim();
  const prefixo = bruto.match(/^(sr|sra|srta|senhor|senhora)\.?\s+/i);
  const nome = prefixo ? bruto.slice(prefixo[0].length).trim() : bruto;
  const fem = d?.genero === "f" || (!d?.genero && !!prefixo && /^(sra|srta|senhora)/i.test(prefixo[1]));
  const pick = <T,>(familia: T, pessoa: T, _antigo?: T) => (tipo === "familia" ? familia : pessoa);

  if (tipo === "familia") {
    const familia = nome ? `Família ${nome.replace(/^fam[ií]lia\s+/i, "")}` : "Família";
    return {
      tipo,
      pick,
      nome,
      /** "a família" ou "a Família Silva" */
      quem: nome ? `a ${familia}` : "a família",
      /** "A família" ou "A Família Silva" */
      Quem: nome ? `A ${familia}` : "A família",
      /** "da família" ou "da Família Silva" (para "a parte da família") */
      da: nome ? `da ${familia}` : "da família",
      /** "à" / "ao" (para "Carta à Família Silva") */
      ao: "à",
      saudacao: `Prezada ${familia},`,
      /** rótulo curto: gráfico de pizza, simulador */
      rotulo: familia,
      /** "recebê-los" / "recebê-lo" / "recebê-la" */
      recebe: "recebê-los",
      /** Partes do texto que viram campos travados (o nome muda de uma proposta para outra) */
      campos: (nome ? [["da", `da ${familia}`], ["quem", `a ${familia}`], ["Quem", `A ${familia}`], ["familia", familia]] : []) as [string, string][],
      ...trocasDe(!!nome, nome
        ? { da: `da ${familia}`, quem: `a ${familia}`, Quem: `A ${familia}`, aoRotulo: `à ${familia}` }
        : { da: "da família", quem: "a família", Quem: "A família", aoRotulo: "à família" }),
    };
  }

  const pessoa = nome ? `${fem ? "Sra." : "Sr."} ${nome}` : fem ? "proprietária" : "proprietário";
  const rotulo = nome ? pessoa : fem ? "Proprietária" : "Proprietário";
  const quem = `${fem ? "a" : "o"} ${pessoa}`;
  const Quem = `${fem ? "A" : "O"} ${pessoa}`;
  const da = `${fem ? "da" : "do"} ${pessoa}`;
  return {
    tipo,
    pick,
    nome,
    quem,
    Quem,
    da,
    ao: fem ? "à" : "ao",
    saudacao: `${fem ? "Prezada" : "Prezado"} ${rotulo},`,
    rotulo,
    recebe: fem ? "recebê-la" : "recebê-lo",
    // do mais longo para o mais curto ("do Sr. João" antes de "o Sr. João" e de "Sr. João")
    campos: [["da", da], ["quem", quem], ["Quem", Quem], ["rotulo", rotulo], ["pessoa", pessoa]] as [string, string][],
    ...trocasDe(true, { da, quem, Quem, aoRotulo: `${fem ? "à" : "ao"} ${pessoa}` }),
  };
}

const L = "(?<![\\p{L}])";
const R = "(?![\\p{L}])";
/**
 * Textos (também os já editados no template ou na proposta) que falam do leitor de forma genérica
 * ("a família", "o proprietário", "dos proprietários", "o terrenista") passam a usar o destinatário
 * escolhido: "da Família Silva", "do Sr. João"... Viram campos travados, como os números.
 *   familiaGenerica: "a família" também é trocada (pessoa, ou família com sobrenome)
 * `valores` sempre existe, para um texto salvo com {{da}} continuar certo se o destinatário mudar.
 */
function trocasDe(familiaGenerica: boolean, v: { da: string; quem: string; Quem: string; aoRotulo: string }) {
  const re = (t: string) => new RegExp(`${L}(?:${t})${R}`, "gu");
  const trocas: [string, RegExp][] = [
    // proprietário / terrenista: sempre (família sem sobrenome vira "a família")
    ["da", re("do proprietário|da proprietária|dos proprietários|do terrenista")],
    ["aoRotulo", re("ao proprietário|à proprietária|aos proprietários|ao terrenista")],
    ["quem", re("o proprietário|a proprietária|os proprietários|o terrenista")],
    ["Quem", re("O proprietário|A proprietária|Os proprietários|O terrenista")],
  ];
  if (familiaGenerica)
    trocas.push(["da", re("da família")], ["aoRotulo", re("à família")], ["quem", re("a família")], ["Quem", re("A família")]);
  return { trocas, valores: v };
}

export type Tratamento = ReturnType<typeof tratamento>;

/**
 * Texto que depende do destinatário: o nome (e "o Sr. João", "do Sr. João"...) vira {{campo}},
 * para a edição valer para qualquer pessoa e o nome continuar vindo da proposta.
 */
export function comCampos(texto: string, d: Tratamento, vars?: Record<string, string>) {
  let t = texto;
  const v: Record<string, string> = { ...(vars ?? {}) };
  for (const [campo, valor] of d.campos) {
    if (!valor || !t.includes(valor)) continue;
    const re = new RegExp(`(?<![\\p{L}])${valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "gu");
    if (!re.test(t)) continue;
    t = t.replace(re, `{{${campo}}}`);
    v[campo] = valor;
  }
  return { texto: t, vars: Object.keys(v).length ? v : undefined };
}
