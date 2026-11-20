// Ponte WhatsApp → Claude Code (pedido 20/11/2026). Roda na VPS como serviço (usuário jbl).
// Busca no Facilita os pedidos do grupo JBL - Claude, roda o Claude Code com a assinatura (claude -p),
// só com ferramentas de pesquisa e leitura (não altera arquivos nem roda comandos), e devolve a resposta.
// Variáveis (arquivo ~/.ponte.env): CLAUDE_PONTE_SECRET (a mesma da Vercel) e FACILITA_URL.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const URL_BASE = (process.env.FACILITA_URL || "https://jbl-facilita.com.br").replace(/\/+$/, "");
const SEGREDO = process.env.CLAUDE_PONTE_SECRET || "";
const PASTA = `${homedir()}/pesquisas`;
const ESTUDOS = `${homedir()}/estudos`;
const ESPERA_MS = 30_000;
const LIMITE_MS = 20 * 60_000;
const FERRAMENTAS = "WebSearch,WebFetch,Read,Glob,Grep";
// estudo e mercado: o Claude trabalha na pasta ~/estudos (scripts de mapas, arquivos do estudo); instruções em ~/estudos/CLAUDE.md
const FERRAMENTAS_ESTUDO = "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch";
const LIMITE_ESTUDO_MS = 90 * 60_000;
const MAX_HTML = 3.8 * 1024 * 1024;

if (SEGREDO.length < 24) {
  console.error("Falta CLAUDE_PONTE_SECRET em ~/.ponte.env");
  process.exit(1);
}
mkdirSync(PASTA, { recursive: true });
const cab = { Authorization: `Bearer ${SEGREDO}`, "Content-Type": "application/json" };

const instrucoes = (autor, texto) => `Você é o assistente de pesquisa da JBL Incorporadora (loteamentos). Pedido de ${autor || "alguém da equipe"} pelo WhatsApp:

${texto}

Regras: responda em português do Brasil, para ler no WhatsApp (até 25 linhas, sem tabelas largas). Pesquise na web quando precisar de dado atual. Diga o grau de certeza; marque o que é preço pedido (anúncio) e o que é venda fechada; não invente número. Termine com as fontes (só o domínio). Você não altera o sistema nem arquivos: só pesquisa e responde.`;

function rodarClaude(prompt, { cwd = PASTA, ferramentas = FERRAMENTAS, limite = LIMITE_MS, turnos = "40" } = {}) {
  return new Promise((resolve) => {
    const p = spawn("claude", ["-p", prompt, "--output-format", "text", "--allowedTools", ferramentas, "--max-turns", turnos], { cwd, env: process.env });
    let out = "", err = "";
    const t = setTimeout(() => p.kill("SIGTERM"), limite);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      clearTimeout(t);
      resolve(code === 0 && out.trim() ? { ok: true, texto: out.trim() } : { ok: false, texto: `Não consegui terminar a pesquisa (${code === null ? "passou do tempo limite" : "erro"}). ${err.slice(-300)}`.trim() });
    });
  });
}

/** Estudo da área (Viabilidade Legal) ou mercado (Viabilidade Mercadológica): pasta de trabalho, Claude, 3 arquivos */
async function estudo(c) {
  const pasta = `${ESTUDOS}/trabalho/${c.id}`;
  mkdirSync(pasta, { recursive: true });
  const a = c.area || {};
  writeFileSync(`${pasta}/entrada.json`, JSON.stringify({ tipo: c.tipo, pedido: c.texto, area: { nome: a.nome, cidade: a.cidade, uf: a.uf, hectares: a.hectares }, poligono: a.poligono, estudo1: a.estudo1, estudo2: a.estudo2 }, null, 1));
  const prompt = `Leia ~/estudos/CLAUDE.md e as referências que ele indica. Depois faça o pedido descrito em trabalho/${c.id}/entrada.json (tipo "${c.tipo}") e entregue em trabalho/${c.id}/ os três arquivos: relatorio.html, resultado.json e resposta.txt.`;
  const res = await rodarClaude(prompt, { cwd: ESTUDOS, ferramentas: FERRAMENTAS_ESTUDO, limite: LIMITE_ESTUDO_MS, turnos: "400" });
  const ler = (f) => (existsSync(`${pasta}/${f}`) ? readFileSync(`${pasta}/${f}`, "utf8") : "");
  let estudoJson = null;
  try { estudoJson = JSON.parse(ler("resultado.json") || "null"); } catch {}
  const html = existsSync(`${pasta}/relatorio.html`) && statSync(`${pasta}/relatorio.html`).size <= MAX_HTML ? ler("relatorio.html") : "";
  const resposta = ler("resposta.txt").trim() || res.texto;
  const ok = !!(estudoJson || html);
  return { ok, resposta: ok ? resposta : `Não consegui terminar o estudo. ${res.texto}`.slice(0, 2000), estudo: estudoJson, relatorioHtml: html };
}

async function ciclo() {
  const r = await fetch(`${URL_BASE}/api/claude/fila`, { headers: cab });
  if (!r.ok) throw new Error(`fila: ${r.status}`);
  const c = await r.json();
  if (!c.id) return false;
  console.log(new Date().toISOString(), "pedido", c.id, c.tipo);
  if (c.tipo === "estudo" || c.tipo === "mercado") {
    await fetch(`${URL_BASE}/api/claude/fila`, { method: "POST", headers: cab, body: JSON.stringify({ id: c.id, ...(await estudo(c)) }) });
    return true;
  }
  // leitura das conversas particulares (pedido 20/11/2026): o texto já vem pronto; sem ferramentas, rápido
  if (c.tipo === "classificar") {
    const res = await rodarClaude(c.texto, { ferramentas: "Read", limite: 8 * 60_000, turnos: "3" });
    await fetch(`${URL_BASE}/api/claude/fila`, { method: "POST", headers: cab, body: JSON.stringify({ id: c.id, ok: res.ok, resposta: res.texto }) });
    return true;
  }
  const res = await rodarClaude(instrucoes(c.autor, c.texto));
  await fetch(`${URL_BASE}/api/claude/fila`, { method: "POST", headers: cab, body: JSON.stringify({ id: c.id, ok: res.ok, resposta: res.texto }) });
  return true;
}

for (;;) {
  let teve = false;
  try {
    teve = await ciclo();
  } catch (e) {
    console.error(new Date().toISOString(), e.message);
  }
  if (!teve) await new Promise((r) => setTimeout(r, ESPERA_MS));
}
