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
      /** "a família" */
      quem: "a família",
      /** "A família" */
      Quem: "A família",
      /** "da família" (para "a parte da família") */
      da: "da família",
      /** "à" / "ao" (para "Carta à Família Silva") */
      ao: "à",
      saudacao: `Prezada ${familia},`,
      /** rótulo curto: gráfico de pizza, simulador */
      rotulo: familia,
      /** "recebê-los" / "recebê-lo" / "recebê-la" */
      recebe: "recebê-los",
      /** Partes do texto que viram campos travados (o nome muda de uma proposta para outra) */
      campos: (nome ? [["familia", familia]] : []) as [string, string][],
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
  };
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
    t = t.split(valor).join(`{{${campo}}}`);
    v[campo] = valor;
  }
  return { texto: t, vars: Object.keys(v).length ? v : undefined };
}
