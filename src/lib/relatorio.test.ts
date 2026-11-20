import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { comImagens, lerRelatorio } from "./relatorio";

describe("raio-x completo", () => {
  const r = lerRelatorio(readFileSync("prisma/dados/relatorios/sorocaba.html", "utf8"))!;
  it("lê o estudo no padrão: 18 seções (resumo de certeza + 17) e as 10 imagens", () => {
    expect(r.relatorio.titulo).toBe("Estudo 1 · Viabilidade da área: Sorocaba/SP, 21,4 ha na Rod. Celso Charuri");
    expect(r.relatorio.secoes).toHaveLength(18);
    expect(r.relatorio.secoes[12].titulo).toBe("12. ★ Região");
    expect(r.imagens).toHaveLength(10);
  });
  it("monta tabela, quadros e listas sem HTML perigoso", () => {
    const cen = r.relatorio.secoes.find((s) => s.titulo === "11. Cenários")!;
    const t = cen.blocos.find((b) => b.t === "tabela");
    expect(t && t.t === "tabela" && t.linhas[0]).toEqual(["<strong>300 m²</strong> (12 × 25 m, mínimo da ZRDS)", "27", "<strong>167</strong>", "283"]);
    expect(JSON.stringify(r.relatorio)).not.toMatch(/<script|onerror|data:image/);
  });
  it("não lê HTML sem título nem seções", () => {
    expect(lerRelatorio("<p>oi</p>")).toBeNull();
    expect(lerRelatorio("<h1>X</h1><img src=x onerror=alert(1)>")).toBeNull();
  });
  it("troca o número da imagem pelo endereço", () => {
    const urls = r.imagens.map((_, i) => `/a${i}`);
    const c = comImagens(r.relatorio, urls);
    const imgs = c.secoes.flatMap((s) => s.blocos).filter((b) => b.t === "img");
    expect(imgs.map((b) => b.t === "img" && b.img)).toEqual(urls);
  });
});

describe("sem nomes", async () => {
  const { semNomes } = await import("./relatorio");
  it("troca o nome de quem não deve aparecer", () => {
    const r = semNomes({ titulo: "Área", lede: "", veredito: "", destaque: "", secoes: [{ titulo: "2", blocos: [{ t: "p", html: "Arquivo Japatinga - Flavio Parceiro.kmz; dono Flávio" }] }] }, ["Flavio Parceiro", "Flávio", "Flavio"]);
    expect(JSON.stringify(r)).not.toMatch(/Fl[aá]vio/);
  });
});
