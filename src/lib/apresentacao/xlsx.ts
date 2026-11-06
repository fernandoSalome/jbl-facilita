/**
 * Leitor mínimo de .xlsx (sem dependências): o arquivo é um zip de XMLs. Devolve, por aba, o valor que o
 * Excel guardou em cada célula (o resultado das fórmulas, como estava quando a planilha foi salva) e o texto
 * das fórmulas (as compartilhadas já com as referências andadas para cada célula).
 */
import { inflateRawSync } from "zlib";
import { colNum, deslocar } from "./formulas";

export type Valor = number | string | boolean | null;
export type Aba = { nome: string; celulas: Map<string, Valor>; formulas?: Map<string, string> };

function descompactar(buf: Buffer): Map<string, Buffer> {
  // fim do diretório central (assinatura 0x06054b50), procurado de trás para frente
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error("O arquivo não é uma planilha .xlsx válida.");
  const qtd = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = new Map<string, Buffer>();
  for (let n = 0; n < qtd; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10);
    const tamanho = buf.readUInt32LE(p + 20);
    const lenNome = buf.readUInt16LE(p + 28), lenExtra = buf.readUInt16LE(p + 30), lenComent = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString("utf8", p + 46, p + 46 + lenNome);
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const dados = buf.subarray(ini, ini + tamanho);
    if (metodo === 0) arquivos.set(nome, dados);
    else if (metodo === 8) arquivos.set(nome, inflateRawSync(dados));
    p += 46 + lenNome + lenExtra + lenComent;
  }
  return arquivos;
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const xml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m,
  );
const textos = (trecho: string) => [...trecho.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => xml(m[1])).join("");

export function lerXlsx(buf: Buffer): Aba[] {
  const z = descompactar(buf);
  const ler = (n: string) => z.get(n)?.toString("utf8") ?? "";
  const compartilhados = [...ler("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textos(m[1]));
  const rels = new Map([...ler("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1] ?? "";
    const alvo = /\bTarget="([^"]+)"/.exec(m[0])?.[1] ?? "";
    return [id, alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo}`];
  }));
  const abas: Aba[] = [];
  for (const m of ler("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const nome = xml(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? "");
    const rid = /\br:id="([^"]+)"/.exec(m[0])?.[1] ?? "";
    const corpo = ler(rels.get(rid) ?? "");
    const celulas = new Map<string, Valor>();
    const formulas = new Map<string, string>();
    const mestres = new Map<string, { f: string; linha: number; col: number }>();
    for (const c of corpo.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1];
      if (!ref || !c[2]) continue;
      const f = /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(c[2]);
      if (f) {
        const [, col, lin] = /([A-Z]+)(\d+)/.exec(ref)!;
        const si = /\bt="shared"/.test(f[1]) ? /\bsi="(\d+)"/.exec(f[1])?.[1] : undefined;
        if (f[2]) {
          const texto = xml(f[2]);
          formulas.set(ref, texto);
          if (si !== undefined) mestres.set(si, { f: texto, linha: Number(lin), col: colNum(col) });
        } else if (si !== undefined && mestres.has(si)) {
          const m = mestres.get(si)!;
          formulas.set(ref, deslocar(m.f, Number(lin) - m.linha, colNum(col) - m.col));
        }
      }
      const tipo = /\bt="([^"]+)"/.exec(c[1])?.[1] ?? "n";
      const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(c[2])?.[1];
      let val: Valor = null;
      if (tipo === "s") val = v !== undefined ? compartilhados[Number(v)] ?? null : null;
      else if (tipo === "inlineStr") val = textos(c[2]);
      else if (tipo === "str") val = v !== undefined ? xml(v) : null;
      else if (tipo === "b") val = v === "1";
      else if (tipo === "e") val = null;
      else val = v !== undefined && v !== "" ? Number(v) : null;
      celulas.set(ref, val);
    }
    abas.push({ nome, celulas, formulas });
  }
  return abas;
}
