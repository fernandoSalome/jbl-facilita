/**
 * Documentos que o estudo da VPS baixou (pedido 26/11/2026: "guardamos a fonte dos locais que procuramos?").
 * Função pura: confere o nome, o tipo pelo conteúdo e o tamanho antes de ir para a aba Documentos da área.
 */
export const MAX_DOC_ESTUDO = 3 * 1024 * 1024;

const TIPOS: [RegExp, string, (b: Buffer) => boolean][] = [
  [/\.pdf$/i, "application/pdf", (b) => b.subarray(0, 5).toString("latin1") === "%PDF-"],
  [/\.png$/i, "image/png", (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))],
  [/\.jpe?g$/i, "image/jpeg", (b) => b[0] === 0xff && b[1] === 0xd8],
];

export function documentoDoEstudo(nome: unknown, base64: unknown): { erro: string } | { fileName: string; titulo: string; mime: string; tipo: string; data: Buffer } {
  const fileName = typeof nome === "string" ? nome.replace(/[^\p{L}\p{N} ._()-]/gu, "").trim().slice(0, 120) : "";
  const t = TIPOS.find(([re]) => re.test(fileName));
  if (!fileName || !t) return { erro: "Só PDF, PNG ou JPG" };
  if (typeof base64 !== "string" || base64.length > Math.ceil((MAX_DOC_ESTUDO * 4) / 3) + 4) return { erro: "Arquivo grande demais" };
  const data = Buffer.from(base64, "base64");
  if (!data.length || data.length > MAX_DOC_ESTUDO) return { erro: "Arquivo grande demais" };
  if (!t[2](data)) return { erro: "O conteúdo não confere com o tipo do arquivo" };
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return { fileName, titulo: `Fonte do estudo: ${base}`.slice(0, 160), mime: t[1], tipo: /certid/i.test(base) ? "certidao" : t[1] === "application/pdf" ? "outro" : "planta", data };
}
