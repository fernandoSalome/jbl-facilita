/**
 * Fórmulas do Excel, só as que a planilha JBL_Planilha(+)Infra usa na aba CUSTOS e no que ela puxa
 * (SOMA, SE, SEERRO, ÉNÚM, PROCURAR, ÍNDICE, CORRESP, OU e algumas comuns). Serve para a planilha aberta na
 * página refazer as contas quando alguém troca um número, como o Excel faria.
 * Fórmula com algo que não está aqui dá erro de "não suportado": quem chama fica com o valor que o Excel guardou.
 */
import type { Valor } from "./xlsx";

export type Erro = { erro: string };
type Faixa = { faixa: Valor[][] };
type V = Valor | Erro | Faixa;

export class NaoSuportado extends Error {}

const ehErro = (x: unknown): x is Erro => !!x && typeof x === "object" && "erro" in x;
const ehFaixa = (x: unknown): x is Faixa => !!x && typeof x === "object" && "faixa" in x;
const ERRO = (e: string): Erro => ({ erro: e });

// ---------- referências ----------

export const colNum = (c: string) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
export const colNome = (n: number) => {
  let s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// aba (com ou sem aspas) + célula, sem pegar nome de função (LOG10) nem pedaço de outra palavra
const REF = /(?<![\w.$'])((?:'(?:[^']|'')+'|[A-Za-z_À-ú][\w.À-ú]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?![\w(!])/g;

/** Fórmula compartilhada do Excel: o texto fica na primeira célula; as outras andam as referências sem $ */
export function deslocar(f: string, dLinha: number, dCol: number): string {
  if (!dLinha && !dCol) return f;
  return f
    .split(/("(?:[^"]|"")*")/)
    .map((parte, i) =>
      i % 2
        ? parte
        : parte.replace(REF, (_m, aba = "", dc: string, c: string, dr: string, r: string) =>
            `${aba}${dc}${dc ? c : colNome(colNum(c) + dCol)}${dr}${dr ? r : Number(r) + dLinha}`,
          ),
    )
    .join("");
}

// ---------- leitura da fórmula ----------

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; aba: string | null; a: string; b: string | null }
  | { t: "fn"; v: string }
  | { t: "op"; v: string };

function tokens(f: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const s = f.trim().replace(/^=/, "");
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1, v = "";
      for (;;) {
        if (j >= s.length) throw new NaoSuportado("texto sem fim");
        if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j += 2; continue; } break; }
        v += s[j++];
      }
      out.push({ t: "str", v });
      i = j + 1;
      continue;
    }
    const resto = s.slice(i);
    const ref = /^((?:'((?:[^']|'')+)'|([A-Za-z_À-ú][\w.À-ú]*))!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?(?![\w(!])/.exec(resto);
    if (ref) {
      const aba = ref[2] ? ref[2].replace(/''/g, "'") : ref[3] ?? null;
      out.push({ t: "ref", aba, a: ref[4] + ref[5], b: ref[6] ? ref[6] + ref[7] : null });
      i += ref[0].length;
      continue;
    }
    const num = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(resto) ?? /^\.\d+([eE][+-]?\d+)?/.exec(resto);
    if (num) { out.push({ t: "num", v: Number(num[0]) }); i += num[0].length; continue; }
    const fn = /^(?:_xlfn\.)?([A-Za-z][\w.]*)\s*\(/.exec(resto);
    if (fn) { out.push({ t: "fn", v: fn[1].toUpperCase() }); i += fn[0].length; continue; }
    const bool = /^(TRUE|FALSE)(?![\w(])/i.exec(resto);
    if (bool) { out.push({ t: "bool", v: bool[1].toUpperCase() === "TRUE" }); i += bool[0].length; continue; }
    const op = /^(<>|<=|>=|[-+*/^&=<>%(),;])/.exec(resto);
    if (op) { out.push({ t: "op", v: op[1] === ";" ? "," : op[1] }); i += op[0].length; continue; }
    throw new NaoSuportado(`não entendi "${resto.slice(0, 12)}"`);
  }
  return out;
}

export type No =
  | { k: "val"; v: Valor }
  | { k: "ref"; aba: string | null; a: string; b: string | null }
  | { k: "fn"; nome: string; args: No[] }
  | { k: "un"; op: string; x: No }
  | { k: "bin"; op: string; a: No; b: No };

const PREC: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

export function analisar(f: string): No {
  const tk = tokens(f);
  let p = 0;
  const olhar = () => tk[p];
  const op = (v: string) => { const t = tk[p]; if (t?.t === "op" && t.v === v) { p++; return true; } return false; };
  const expr = (min: number): No => {
    let esq = unario();
    for (;;) {
      const t = olhar();
      if (t?.t !== "op" || !(t.v in PREC) || PREC[t.v] < min) break;
      p++;
      const dir = expr(PREC[t.v] + (t.v === "^" ? 0 : 1));
      esq = { k: "bin", op: t.v, a: esq, b: dir };
    }
    return esq;
  };
  const unario = (): No => {
    if (op("-")) return { k: "un", op: "-", x: unario() };
    if (op("+")) return unario();
    let x = primario();
    while (op("%")) x = { k: "un", op: "%", x };
    return x;
  };
  const primario = (): No => {
    const t = tk[p++];
    if (!t) throw new NaoSuportado("fórmula incompleta");
    if (t.t === "num" || t.t === "str" || t.t === "bool") return { k: "val", v: t.v };
    if (t.t === "ref") return { k: "ref", aba: t.aba, a: t.a, b: t.b };
    if (t.t === "fn") {
      const args: No[] = [];
      if (!op(")")) {
        for (;;) {
          // argumento vazio (ex.: SE(x;;1)) vale vazio
          const n = olhar();
          if (n?.t === "op" && (n.v === "," || n.v === ")")) args.push({ k: "val", v: null });
          else args.push(expr(0));
          if (op(")")) break;
          if (!op(",")) throw new NaoSuportado("faltou ; ou )");
        }
      }
      return { k: "fn", nome: t.v, args };
    }
    if (t.t === "op" && t.v === "(") {
      const x = expr(0);
      if (!op(")")) throw new NaoSuportado("faltou )");
      return x;
    }
    throw new NaoSuportado("fórmula com símbolo inesperado");
  };
  const raiz = expr(0);
  if (p < tk.length) throw new NaoSuportado("sobrou parte da fórmula");
  return raiz;
}

// ---------- contas ----------

export type Leitor = (aba: string, ref: string) => Valor | Erro;

const numero = (x: V): number | Erro => {
  if (ehErro(x)) return x;
  if (ehFaixa(x)) return numero(x.faixa[0]?.[0] ?? null);
  if (x === null || x === "") return 0;
  if (typeof x === "number") return x;
  if (typeof x === "boolean") return x ? 1 : 0;
  const n = Number(x.replace(",", "."));
  return Number.isFinite(n) && x.trim() !== "" ? n : ERRO("#VALUE!");
};
const texto = (x: V): string | Erro => {
  if (ehErro(x)) return x;
  if (ehFaixa(x)) return texto(x.faixa[0]?.[0] ?? null);
  if (x === null) return "";
  if (typeof x === "boolean") return x ? "TRUE" : "FALSE";
  return typeof x === "number" ? String(x) : x;
};
const logico = (x: V): boolean | Erro => {
  if (ehErro(x)) return x;
  if (ehFaixa(x)) return logico(x.faixa[0]?.[0] ?? null);
  if (typeof x === "boolean") return x;
  if (x === null) return false;
  if (typeof x === "number") return x !== 0;
  const u = x.toUpperCase();
  if (u === "TRUE") return true;
  if (u === "FALSE") return false;
  return ERRO("#VALUE!");
};
const simples = (x: V): Valor | Erro => (ehFaixa(x) ? x.faixa[0]?.[0] ?? null : x);
const valoresDe = (x: V): (Valor | Erro)[] => (ehFaixa(x) ? x.faixa.flat() : [x]);

function comparar(a: Valor | Erro, b: Valor | Erro): number {
  const na = a === null ? (typeof b === "string" ? "" : 0) : a;
  const nb = b === null ? (typeof a === "string" ? "" : 0) : b;
  const ordem = (v: unknown) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);
  if (ordem(na) !== ordem(nb)) return ordem(na) - ordem(nb);
  if (typeof na === "string") return na.toLowerCase().localeCompare(String(nb).toLowerCase());
  return Number(na) - Number(nb);
}

const arred = (n: number, d: number, modo: "perto" | "cima" | "baixo") => {
  const f = 10 ** d;
  const x = Math.abs(n) * f;
  const r = modo === "perto" ? Math.round(x + 1e-9) : modo === "cima" ? Math.ceil(x - 1e-9) : Math.floor(x + 1e-9);
  return (Math.sign(n) * r) / f;
};

export function avaliar(no: No, aba: string, ler: Leitor): V {
  const ev = (n: No) => avaliar(n, aba, ler);
  switch (no.k) {
    case "val":
      return no.v;
    case "ref": {
      const a = no.aba ?? aba;
      if (!no.b) return ler(a, no.a);
      const [, c1, r1] = /([A-Z]+)(\d+)/.exec(no.a)!, [, c2, r2] = /([A-Z]+)(\d+)/.exec(no.b)!;
      const faixa: Valor[][] = [];
      for (let r = Math.min(+r1, +r2); r <= Math.max(+r1, +r2); r++) {
        const linha: Valor[] = [];
        for (let c = Math.min(colNum(c1), colNum(c2)); c <= Math.max(colNum(c1), colNum(c2)); c++) {
          const v = ler(a, `${colNome(c)}${r}`);
          linha.push(ehErro(v) ? null : v);
        }
        faixa.push(linha);
      }
      return { faixa };
    }
    case "un": {
      const x = numero(ev(no.x));
      if (ehErro(x)) return x;
      return no.op === "-" ? -x : x / 100;
    }
    case "bin": {
      const a = simples(ev(no.a)), b = simples(ev(no.b));
      if (ehErro(a)) return a;
      if (ehErro(b)) return b;
      if (no.op === "&") return `${texto(a)}${texto(b)}`;
      if (PREC[no.op] === 1) {
        const c = comparar(a, b);
        return { "=": c === 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[no.op]!;
      }
      const x = numero(a), y = numero(b);
      if (ehErro(x)) return x;
      if (ehErro(y)) return y;
      if (no.op === "+") return x + y;
      if (no.op === "-") return x - y;
      if (no.op === "*") return x * y;
      if (no.op === "/") return y === 0 ? ERRO("#DIV/0!") : x / y;
      return x ** y;
    }
    case "fn":
      return funcao(no.nome, no.args, ev);
  }
}

function funcao(nome: string, args: No[], ev: (n: No) => V): V {
  const arg = (i: number) => (args[i] ? ev(args[i]) : null);
  const nums = (): number[] | Erro => {
    const out: number[] = [];
    for (const a of args) {
      const v = ev(a);
      if (ehFaixa(v)) {
        for (const x of v.faixa.flat()) if (typeof x === "number") out.push(x);
      } else {
        const n = numero(v);
        if (ehErro(n)) return n;
        out.push(n);
      }
    }
    return out;
  };
  switch (nome) {
    case "SUM": {
      const n = nums();
      return ehErro(n) ? n : n.reduce((s, x) => s + x, 0);
    }
    case "MIN": case "MAX": {
      const n = nums();
      if (ehErro(n)) return n;
      return n.length ? (nome === "MIN" ? Math.min(...n) : Math.max(...n)) : 0;
    }
    case "AVERAGE": {
      const n = nums();
      if (ehErro(n)) return n;
      return n.length ? n.reduce((s, x) => s + x, 0) / n.length : ERRO("#DIV/0!");
    }
    case "IF": {
      const c = logico(arg(0));
      if (ehErro(c)) return c;
      return c ? (args[1] ? ev(args[1]) : true) : args[2] ? ev(args[2]) : false;
    }
    case "IFERROR": {
      const v = arg(0);
      return ehErro(ehFaixa(v) ? simples(v) : v) ? arg(1) : v;
    }
    case "ISNUMBER":
      return typeof simples(arg(0)) === "number";
    case "ISBLANK":
      return simples(arg(0)) === null;
    case "ISERROR":
      return ehErro(simples(arg(0)));
    case "OR": case "AND": {
      const vals = args.flatMap((a) => valoresDe(ev(a))).filter((x) => x !== null);
      const b: boolean[] = [];
      for (const x of vals) {
        const l = logico(x);
        if (ehErro(l)) return l;
        b.push(l);
      }
      return nome === "OR" ? b.some(Boolean) : b.every(Boolean);
    }
    case "NOT": {
      const l = logico(arg(0));
      return ehErro(l) ? l : !l;
    }
    case "SEARCH": {
      const a = texto(arg(0)), b = texto(arg(1));
      if (ehErro(a)) return a;
      if (ehErro(b)) return b;
      const ini = args[2] ? numero(arg(2)) : 1;
      if (ehErro(ini)) return ini;
      const k = b.toLowerCase().indexOf(a.toLowerCase(), ini - 1);
      return k < 0 ? ERRO("#VALUE!") : k + 1;
    }
    case "INDEX": {
      const f = arg(0);
      if (!ehFaixa(f)) return args.length > 1 ? simples(f) : f;
      const r = numero(arg(1));
      if (ehErro(r)) return r;
      const c = args[2] ? numero(arg(2)) : null;
      if (ehErro(c)) return c;
      let lin = r, col = c ?? 1;
      // uma linha só e um número só: é a coluna
      if (c === null && f.faixa.length === 1) { lin = 1; col = r; }
      const v = f.faixa[lin - 1]?.[col - 1];
      return v === undefined || lin < 1 || col < 1 ? ERRO("#REF!") : v;
    }
    case "MATCH": {
      const alvo = simples(arg(0));
      if (ehErro(alvo)) return alvo;
      const f = arg(1);
      const lista = ehFaixa(f) ? (f.faixa.length === 1 ? f.faixa[0] : f.faixa.map((l) => l[0])) : [f as Valor];
      const tipo = args[2] ? numero(arg(2)) : 1;
      if (ehErro(tipo)) return tipo;
      if (tipo === 0) {
        const k = lista.findIndex((x) => x !== null && comparar(x, alvo) === 0 && typeof x === typeof alvo);
        return k < 0 ? ERRO("#N/A") : k + 1;
      }
      let achou = -1;
      for (let k = 0; k < lista.length; k++) {
        const x = lista[k];
        if (x === null || typeof x !== typeof alvo) continue;
        const c = comparar(x, alvo);
        if (tipo > 0 ? c <= 0 : c >= 0) achou = k;
        else break;
      }
      return achou < 0 ? ERRO("#N/A") : achou + 1;
    }
    case "VLOOKUP": {
      const alvo = simples(arg(0));
      if (ehErro(alvo)) return alvo;
      const f = arg(1);
      if (!ehFaixa(f)) return ERRO("#N/A");
      const col = numero(arg(2));
      if (ehErro(col)) return col;
      const exato = args[3] ? logico(arg(3)) === false || numero(arg(3)) === 0 : false;
      let achou = -1;
      for (let k = 0; k < f.faixa.length; k++) {
        const x = f.faixa[k][0];
        if (x === null) continue;
        const c = comparar(x, alvo);
        if (exato) { if (c === 0) { achou = k; break; } } else if (c <= 0) achou = k; else break;
      }
      return achou < 0 ? ERRO("#N/A") : f.faixa[achou][col - 1] ?? null;
    }
    case "ROUND": case "ROUNDUP": case "ROUNDDOWN": {
      const n = numero(arg(0)), d = args[1] ? numero(arg(1)) : 0;
      if (ehErro(n)) return n;
      if (ehErro(d)) return d;
      return arred(n, d, nome === "ROUND" ? "perto" : nome === "ROUNDUP" ? "cima" : "baixo");
    }
    case "INT": {
      const n = numero(arg(0));
      return ehErro(n) ? n : Math.floor(n);
    }
    case "ABS": {
      const n = numero(arg(0));
      return ehErro(n) ? n : Math.abs(n);
    }
    case "CEILING": case "CEILING.MATH": {
      const n = numero(arg(0)), m = args[1] ? numero(arg(1)) : 1;
      if (ehErro(n)) return n;
      if (ehErro(m)) return m;
      return m === 0 ? 0 : Math.ceil(n / m - 1e-12) * m;
    }
    default:
      throw new NaoSuportado(`função ${nome}`);
  }
}

export const resultado = (x: V): Valor | Erro => simples(x);
export { ehErro };
