/**
 * Modelo da minuta da SPE que o proprietário vê e baixa pelo passo a passo (pedido 25/11/2026). Só PDF: a página
 * mostra o próprio arquivo e o botão baixa o mesmo.
 */

export const CHAVE_SPE = "spe";
/** a Vercel não aceita corpo maior que 4,5 MB */
export const LIMITE_MODELO = 4 * 1024 * 1024;

/** Confere o arquivo enviado: PDF de verdade (começa com %PDF-) e até 4 MB. Devolve o erro ou null */
export function erroDoModelo(bytes: Uint8Array, nome: string): string | null {
  if (!bytes.length) return "Arquivo vazio.";
  if (bytes.length > LIMITE_MODELO) return "O PDF deve ter até 4 MB.";
  const inicio = String.fromCharCode(...bytes.subarray(0, 5));
  if (inicio !== "%PDF-" || !/\.pdf$/i.test(nome)) return "Envie o modelo em PDF.";
  return null;
}

/** Nome do arquivo baixado: sem caminho nem caracteres estranhos */
export function nomeDoModelo(nome: string): string {
  const limpo = nome.split(/[\\/]/).pop()!.replace(/[^\p{L}\p{N} ._-]/gu, "").trim().slice(0, 100);
  return /\.pdf$/i.test(limpo) ? limpo : "Minuta SPE - JBL.pdf";
}

/** Cabeçalho para baixar com o nome certo (com acento, pelo filename*) */
export const disposicao = (tipo: "inline" | "attachment", nome: string) =>
  `${tipo}; filename="${nome.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
