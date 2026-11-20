// Repetidor do webhook do WhatsApp (pedido 20/11/2026). A Evolution só manda cada conexão para UM endereço;
// este programa recebe e repassa a mesma mensagem para todos os sistemas listados em ALVOS (Facilita e my-leads).
// Escuta só na rede interna do Docker (172.17.0.1), num caminho com código (TOKEN). Variáveis em ~/.repetidor.env.
import { createServer } from "node:http";

const ALVOS = (process.env.ALVOS || "").split(/\s+/).filter((u) => /^https?:\/\//.test(u));
const TOKEN = process.env.TOKEN || "";
const HOST = process.env.HOST || "172.17.0.1";
const PORTA = Number(process.env.PORTA || 8110);
const MAX = 25 * 1024 * 1024;

if (!ALVOS.length || TOKEN.length < 16) {
  console.error("Faltam ALVOS ou TOKEN em ~/.repetidor.env");
  process.exit(1);
}

createServer((req, res) => {
  if (req.method === "GET" && req.url === "/saude") return res.end("ok");
  if (req.method !== "POST" || req.url !== `/wa/${TOKEN}`) {
    res.statusCode = 404;
    return res.end();
  }
  const partes = [];
  let total = 0;
  req.on("data", (c) => {
    total += c.length;
    if (total > MAX) req.destroy();
    else partes.push(c);
  });
  req.on("end", () => {
    res.end("ok"); // responde já; o repasse segue em paralelo
    const corpo = Buffer.concat(partes);
    for (const url of ALVOS) {
      fetch(url, { method: "POST", headers: { "Content-Type": req.headers["content-type"] || "application/json" }, body: corpo, signal: AbortSignal.timeout(30_000) })
        .then((r) => r.status >= 400 && console.error(new Date().toISOString(), new URL(url).host, r.status))
        .catch((e) => console.error(new Date().toISOString(), new URL(url).host, e.message));
    }
  });
}).listen(PORTA, HOST, () => console.log(`repetidor em ${HOST}:${PORTA} → ${ALVOS.map((u) => new URL(u).host).join(", ")}`));
