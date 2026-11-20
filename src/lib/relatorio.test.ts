import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { comImagens, lerRelatorio } from "./relatorio";

describe("raio-x completo", () => {
  const r = lerRelatorio(readFileSync("prisma/dados/relatorios/sorocaba.html", "utf8"))!;
  it("lê título, resumo e as 10 seções, com as 6 imagens", () => {
    expect(r.relatorio.titulo).toBe("Sorocaba, 21,4 ha na Rod. Celso Charuri");
    expect(r.relatorio.veredito).toContain("Viável com ressalva");
    expect(r.relatorio.secoes.map((s) => s.titulo)).toEqual(["Resumo", "Grau de certeza", "Legislação aplicável", "Zoneamento e localização", "Restrições no terreno", "Relevo e riscos", "Quantidade de lotes", "O que dá para fazer", "Alertas", "Próximos passos (antes de assinar)"]);
    expect(r.imagens).toHaveLength(6);
  });
  it("monta tabela, quadros e listas sem HTML perigoso", () => {
    const lotes = r.relatorio.secoes.find((s) => s.titulo === "Quantidade de lotes")!;
    const t = lotes.blocos.find((b) => b.t === "tabela");
    expect(t && t.t === "tabela" && t.linhas[0]).toEqual(["<b>300 m²</b> (12 × 25 m, mínimo da ZRDS)", "27", "<b>167</b>", "283"]);
    const resumo = r.relatorio.secoes[0].blocos.map((b) => b.t);
    expect(resumo).toEqual(["tiles", "cols"]);
    expect(JSON.stringify(r.relatorio)).not.toMatch(/<script|onerror|data:image/);
  });
  it("não lê HTML sem título nem seções", () => {
    expect(lerRelatorio("<p>oi</p>")).toBeNull();
    expect(lerRelatorio("<h1>X</h1><img src=x onerror=alert(1)>")).toBeNull();
  });
  it("troca o número da imagem pelo endereço", () => {
    const c = comImagens(r.relatorio, ["/a0", "/a1", "/a2", "/a3", "/a4", "/a5"]);
    const imgs = c.secoes.flatMap((s) => s.blocos).filter((b) => b.t === "img");
    expect(imgs.map((b) => b.t === "img" && b.img)).toEqual(["/a0", "/a1", "/a2", "/a3", "/a4", "/a5"]);
  });
});

describe("sem nomes", async () => {
  const { semNomes } = await import("./relatorio");
  it("troca o nome de quem não deve aparecer", () => {
    const r = semNomes({ titulo: "Área", lede: "", veredito: "", destaque: "", secoes: [{ titulo: "2", blocos: [{ t: "p", html: "Arquivo Japatinga - Flavio Parceiro.kmz; dono Flávio" }] }] }, ["Flavio Parceiro", "Flávio", "Flavio"]);
    expect(JSON.stringify(r)).not.toMatch(/Fl[aá]vio/);
  });
});
