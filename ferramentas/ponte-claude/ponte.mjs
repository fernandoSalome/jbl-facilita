// Ponte WhatsApp → Claude Code (pedido 20/11/2026). Roda na VPS como serviço (usuário jbl).
// Busca no Facilita os pedidos do grupo JBL - Claude, roda o Claude Code com a assinatura (claude -p),
// só com ferramentas de pesquisa e leitura (não altera arquivos nem roda comandos), e devolve a resposta.
// Variáveis (arquivo ~/.ponte.env): CLAUDE_PONTE_SECRET (a mesma da Vercel) e FACILITA_URL.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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

function rodarClaude(prompt, { cwd = PASTA, ferramentas = FERRAMENTAS, limite = LIMITE_MS, turnos = "40", controle } = {}) {
  return new Promise((resolve) => {
    const p = spawn("claude", ["-p", prompt, "--output-format", "text", "--allowedTools", ferramentas, "--max-turns", turnos], { cwd, env: process.env });
    if (controle) controle.parar = () => p.kill("SIGTERM");
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
  // estudo retomado (pedido 23/11/2026): a pasta guardada continua e o Claude aproveita o que já fez
  const retomando = existsSync(`${pasta}/entrada.json`);
  mkdirSync(pasta, { recursive: true });
  rmSync(`${pasta}/parado.txt`, { force: true });
  const a = c.area || {};
  writeFileSync(`${pasta}/entrada.json`, JSON.stringify({ tipo: c.tipo, pedido: c.texto, area: { nome: a.nome, cidade: a.cidade, uf: a.uf, hectares: a.hectares }, poligono: a.poligono, estudo1: a.estudo1, estudo2: a.estudo2 }, null, 1));
  const prompt = `Leia ~/estudos/CLAUDE.md e as referências que ele indica. Depois faça o pedido descrito em trabalho/${c.id}/entrada.json (tipo "${c.tipo}") e entregue em trabalho/${c.id}/ os três arquivos: relatorio.html, resultado.json e resposta.txt.${retomando ? ` Este estudo foi parado e retomado: a pasta trabalho/${c.id}/ já tem o que foi feito antes (andamento.txt e arquivos). Confira o que já está pronto e continue dali, sem refazer.` : ""}`;
  // andamento (pedido 22/11/2026): o Claude grava "60 Calculando os lotes" em andamento.txt; a cada 30 s vai para a tela.
  // A resposta diz se pediram para parar (pedido 23/11/2026): mata o Claude e guarda a pasta por 5 dias.
  const controle = {};
  let parado = false;
  const vigia = setInterval(() => {
    const linha = existsSync(`${pasta}/andamento.txt`) ? readFileSync(`${pasta}/andamento.txt`, "utf8").trim().split("\n")[0] : "";
    fetch(`${URL_BASE}/api/claude/andamento`, { method: "POST", headers: cab, body: JSON.stringify({ id: c.id, linha }) })
      .then((r) => r.json())
      .then((d) => { if (d?.parar && !parado) { parado = true; controle.parar?.(); } })
      .catch(() => {});
  }, 30_000);
  const res = await rodarClaude(prompt, { cwd: ESTUDOS, ferramentas: FERRAMENTAS_ESTUDO, limite: LIMITE_ESTUDO_MS, turnos: "400", controle });
  clearInterval(vigia);
  if (parado) {
    writeFileSync(`${pasta}/parado.txt`, new Date().toISOString());
    return { parado: true };
  }
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

/** Áudios das conversas particulares (pedido 20/11/2026): fila própria, para não esperar atrás dos estudos */
const PYTHON = `${ESTUDOS}/.venv/bin/python`;
const TRANSCREVER = new URL("./transcrever.py", import.meta.url).pathname;
function transcrever(arquivo) {
  return new Promise((resolve) => {
    const p = spawn(PYTHON, [TRANSCREVER, arquivo]);
    let out = "";
    const t = setTimeout(() => p.kill("SIGTERM"), 10 * 60_000);
    p.stdout.on("data", (d) => (out += d));
    p.on("close", (code) => { clearTimeout(t); resolve(code === 0 ? out.trim() : null); });
  });
}
async function cicloAudio() {
  const r = await fetch(`${URL_BASE}/api/claude/audio`, { headers: cab });
  if (!r.ok) throw new Error(`audio: ${r.status}`);
  const a = await r.json();
  if (a.pulado) return true;
  if (!a.id) return false;
  const arq = `${PASTA}/audio-${a.id}.ogg`;
  writeFileSync(arq, Buffer.from(a.base64, "base64"));
  const texto = await transcrever(arq);
  rmSync(arq, { force: true });
  await fetch(`${URL_BASE}/api/claude/audio`, { method: "POST", headers: cab, body: JSON.stringify({ id: a.id, texto }) });
  return true;
}
(async () => {
  for (;;) {
    let teve = false;
    try { teve = await cicloAudio(); } catch (e) { console.error(new Date().toISOString(), e.message); }
    if (!teve) await new Promise((r) => setTimeout(r, ESPERA_MS));
  }
})();

/** Leitura das conversas do WhatsApp (pedido 20/11/2026): a primeira vez tudo (45 dias), depois a cada 20 minutos
 *  só o que mudou. A data da última leitura fica em ~/ponte/ultima-leitura.txt. */
const ARQ_LEITURA = new URL("./ultima-leitura.txt", import.meta.url).pathname;
async function lerConversas() {
  const inicio = new Date();
  // 5 minutos de folga para não perder mensagem que chegou durante a leitura anterior
  const desde = existsSync(ARQ_LEITURA) ? new Date(Date.parse(readFileSync(ARQ_LEITURA, "utf8").trim()) - 5 * 60_000).toISOString() : null;
  for (let pagina = 0; pagina !== null; ) {
    const r = await fetch(`${URL_BASE}/api/claude/conversas`, { method: "POST", headers: cab, body: JSON.stringify({ pagina, desde }) });
    if (!r.ok) throw new Error(`conversas: ${r.status}`);
    const d = await r.json();
    pagina = d.proxima;
  }
  writeFileSync(ARQ_LEITURA, inicio.toISOString());
}
(async () => {
  for (;;) {
    try { await lerConversas(); } catch (e) { console.error(new Date().toISOString(), e.message); }
    await new Promise((r) => setTimeout(r, 20 * 60_000));
  }
})();

/** Estudo parado há mais de 5 dias sem retomar (pedido 23/11/2026): apaga a pasta. Confere de hora em hora. */
const DIAS_GUARDADO = 5;
function descartarParados() {
  const base = `${ESTUDOS}/trabalho`;
  if (!existsSync(base)) return;
  for (const id of readdirSync(base)) {
    const marca = `${base}/${id}/parado.txt`;
    if (!existsSync(marca)) continue;
    const quando = Date.parse(readFileSync(marca, "utf8").trim());
    if (Number.isFinite(quando) && Date.now() - quando > DIAS_GUARDADO * 24 * 3600e3) rmSync(`${base}/${id}`, { recursive: true, force: true });
  }
}
setInterval(() => { try { descartarParados(); } catch (e) { console.error(new Date().toISOString(), e.message); } }, 3600e3);

for (;;) {
  let teve = false;
  try {
    teve = await ciclo();
  } catch (e) {
    console.error(new Date().toISOString(), e.message);
  }
  if (!teve) await new Promise((r) => setTimeout(r, ESPERA_MS));
}
