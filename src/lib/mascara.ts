/** Máscaras dos campos da carta de intenção: 0 = algarismo; no RG o último pode ser X */
export const CPF = "000.000.000-00";
export const RG = "00.000.000-0";

export function mascarar(valor: string, m: string | ((digitos: string) => string)) {
  const rg = m === RG;
  const limpo = valor.toUpperCase().replace(rg ? /[^0-9X]/g : /\D/g, "");
  const modelo = typeof m === "function" ? m(limpo.replace(/\D/g, "")) : m;
  const vagas = (modelo.match(/0/g) ?? []).length;
  // no RG, o X só vale como último caractere
  const chars = (rg ? limpo.replace(/X(?=.)/g, "") : limpo).slice(0, vagas);
  let out = "";
  let i = 0;
  for (const c of modelo) {
    if (i >= chars.length) break;
    if (c === "0") out += chars[i++];
    else out += c;
  }
  return out;
}
