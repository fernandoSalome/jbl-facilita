import type { Destinatario } from "./proposals";

/**
 * Formas de tratamento da proposta conforme o destinatário:
 *   família      → "Prezada Família", "a família recebe", "vocês"
 *   proprietário → "Prezado Proprietário" / "Prezada Proprietária", "o proprietário recebe", "você"
 *   pessoa       → "Prezado Daniel", "você recebe"
 * `pick(familia, proprietario, pessoa)` escolhe a frase certa.
 */
export function tratamento(d?: Destinatario) {
  const tipo = d?.tipo ?? "familia";
  const fem = d?.genero === "f";
  const nome = (d?.nome ?? "").trim() || "[nome]";
  const pick = <T,>(familia: T, proprietario: T, pessoa: T) => (tipo === "familia" ? familia : tipo === "proprietario" ? proprietario : pessoa);
  const prop = fem ? "proprietária" : "proprietário";
  return {
    tipo,
    pick,
    nome,
    /** "a família" / "o proprietário" / "você" */
    quem: pick("a família", `${fem ? "a" : "o"} ${prop}`, "você"),
    /** "A família" / "O proprietário" / "Você" */
    Quem: pick("A família", `${fem ? "A" : "O"} ${prop}`, "Você"),
    /** "da família" / "do proprietário" (para "a parte da família") */
    da: pick("da família", `${fem ? "da" : "do"} ${prop}`, "sua"),
    saudacao: pick("Prezada Família,", `${fem ? "Prezada" : "Prezado"} ${fem ? "Proprietária" : "Proprietário"},`, `${fem ? "Prezada" : "Prezado"} ${nome},`),
    /** rótulo curto: gráfico de pizza, simulador */
    rotulo: pick("Família", fem ? "Proprietária" : "Proprietário", "Você"),
    /** "recebê-los" / "recebê-lo" / "recebê-la" */
    recebe: pick("recebê-los", fem ? "recebê-la" : "recebê-lo", fem ? "recebê-la" : "recebê-lo"),
  };
}

export type Tratamento = ReturnType<typeof tratamento>;
