import { describe, expect, it } from "vitest";
import { chaveDoTipo, estavel, FORMATOS, FORMATOS_INICIAIS, juntar, mesclarComum, parseContent, qtdTexto, semEmojiHtml, separar, separarEmoji, trocarObras, type FormatoContent } from "./formatos";
import { calcular } from "./calc";
import { cleanOverride } from "./sanitize";
import { limparConteudo } from "./template-salvar";

const com = (f: keyof typeof FORMATOS_INICIAIS, overrides: Record<string, unknown>): FormatoContent => ({ ...FORMATOS_INICIAIS[f], overrides });

describe("template em duas camadas", () => {
  it("separa o que é do tipo (itens das listas) do que é compartilhado", () => {
    const la = FORMATOS_INICIAIS.loteamento_aberto;
    const item = la.infra[0].id;
    const bf = la.benfeitorias[0].id;
    const { comum, tipo } = separar(com("loteamento_aberto", {
      "txt.a1": "Texto do Marcelo",
      [`li.${item}.obra`]: "Topografia",
      [`liq.${item}`]: { kind: "fixa", text: "2 un." },
      [`li.${bf}.emoji`]: "🌲",
      [`estilo.li.${item}.calc`]: { n: "b" },
      "estilo.v.s1v1": { cor: "#B3261E" },
      "li.ct1.nome": "Fulano",
      "link.capaBtn": "#carta",
    }));
    expect(Object.keys(comum.overrides).sort()).toEqual(["estilo.v.s1v1", "li.ct1.nome", "link.capaBtn", "txt.a1"]);
    expect(Object.keys(tipo.overrides).sort()).toEqual([`estilo.li.${item}.calc`, `li.${bf}.emoji`, `li.${item}.obra`, `liq.${item}`].sort());
    expect(juntar(comum, tipo).overrides).toEqual({ ...comum.overrides, ...tipo.overrides });
  });

  it("chaveDoTipo não confunde link. com li.", () => {
    expect(chaveDoTipo("link.la1", new Set(["la1"]))).toBe(false);
    expect(chaveDoTipo("li.la1.obra", new Set(["la1"]))).toBe(true);
  });

  it("o texto alterado em um tipo passa a valer para todos; no mesmo texto vale o mais recente", () => {
    const versoes = [
      { formato: "loteamento_aberto" as const, content: com("loteamento_aberto", { "txt.a1": "Marcelo novo", "txt.a2": "só no aberto" }), createdAt: "2026-10-18T10:00:00Z" },
      { formato: "condominio_urbano" as const, content: com("condominio_urbano", { "txt.a1": "versão antiga" }), createdAt: "2026-10-15T10:00:00Z" },
      { formato: "chacreamento_aberto" as const, content: com("chacreamento_aberto", {}), createdAt: "2026-10-13T10:00:00Z" },
      { formato: "chacreamento_condominio" as const, content: com("chacreamento_condominio", {}), createdAt: "2026-10-13T10:00:00Z" },
    ];
    const m = mesclarComum(versoes);
    expect(m.iguais).toBe(false);
    expect(m.comum.overrides).toEqual({ "txt.a1": "Marcelo novo", "txt.a2": "só no aberto" });
    expect(m.conflitos).toEqual([
      { k: "txt.a1", escolhido: "loteamento_aberto", opcoes: [{ formato: "loteamento_aberto", valor: "Marcelo novo" }, { formato: "condominio_urbano", valor: "versão antiga" }] },
    ]);
    // listas continuam as de cada tipo
    expect(m.tipos.condominio_urbano.benfeitorias).toEqual(FORMATOS_INICIAIS.condominio_urbano.benfeitorias);

    // depois de unificado, nada muda mais (o deploy não repete)
    const unificadas = FORMATOS.map((f) => ({ formato: f, content: juntar(m.comum, m.tipos[f]), createdAt: "2026-10-20T10:00:00Z" }));
    expect(mesclarComum(unificadas).iguais).toBe(true);
  });

  it("estavel ignora a ordem das chaves", () => {
    expect(estavel({ b: 1, a: { d: 2, c: 3 } })).toBe(estavel({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it("limparConteudo mantém o emoji das benfeitorias e o estilo dos números", () => {
    const c = limparConteudo({ ...FORMATOS_INICIAIS.loteamento_aberto, benfeitorias: [{ id: "x1", texto: "Praça", emoji: "🌳" }], overrides: { "estilo.v.s1v1": { n: "b", cor: "#122A45" } } }, "loteamento_aberto");
    expect(c.benfeitorias).toEqual([{ id: "x1", texto: "Praça", emoji: "🌳" }]);
    expect(c.overrides["estilo.v.s1v1"]).toEqual({ n: "b", cor: "#122A45" });
  });
});

describe("estilo dos números da planilha", () => {
  it("só guarda negrito, itálico, sublinhado, cor e tamanho", () => {
    expect(cleanOverride("estilo.v.x", { n: "b", i: true, u: true, cor: "#fff", tam: 1.2, texto: "999" })).toEqual({ n: "b", i: true, u: true, cor: "#fff", tam: 1.2 });
    expect(cleanOverride("estilo.v.x", { cor: "red; background:url(x)" })).toBe(null);
    expect(cleanOverride("estilo.v.x", "R$ 1,00")).toBe(undefined);
  });
});

describe("emoji das benfeitorias", () => {
  it("separa o emoji do começo do texto", () => {
    expect(separarEmoji("🌳 Praça equipada")).toEqual({ emoji: "🌳", texto: "Praça equipada" });
    expect(separarEmoji("🏛️ Portaria (90 a 120 m²)")).toEqual({ emoji: "🏛️", texto: "Portaria (90 a 120 m²)" });
    expect(separarEmoji("🏋️‍♀️ Academia")).toEqual({ emoji: "🏋️‍♀️", texto: "Academia" });
    expect(separarEmoji("Praça")).toEqual({ emoji: null, texto: "Praça" });
    expect(separarEmoji("4 quadras")).toEqual({ emoji: null, texto: "4 quadras" });
  });
  it("tira o emoji também de texto formatado", () => {
    expect(semEmojiHtml("<b>🌳 Praça</b>")).toBe("<b>Praça</b>");
    expect(semEmojiHtml("Praça")).toBe("Praça");
  });
  it("valida o emoji gravado", () => {
    expect(cleanOverride("li.lab1.emoji", "🌲")).toBe("🌲");
    expect(cleanOverride("li.lab1.emoji", "<script>")).toBe(undefined);
    expect(cleanOverride("lista.benfeitorias", { added: [{ id: "n1", texto: "Lago", emoji: "🛶" }] })).toEqual({ added: [{ id: "n1", texto: "Lago", emoji: "🛶" }], removed: [] });
  });
});

describe("planilha nova (2026) como regra", () => {
  it("todos os tipos usam as fórmulas de 2026, inclusive versões antigas sem a marca", () => {
    for (const f of FORMATOS) {
      expect(FORMATOS_INICIAIS[f].planilha).toBe("2026");
      expect(parseContent({ label: "x", infra: [], overrides: {} }, f).planilha).toBe("2026");
      expect(limparConteudo(FORMATOS_INICIAIS[f], f).planilha).toBe("2026");
    }
  });
  it("poços de visita, bocas de lobo e bigode ficam 'A projetar' sem o tamanho da quadra", () => {
    const r = calcular({ areaTotal: 100000, metragemLote: 360, frenteLote: 12, aproveitamento: 0.5, valorM2Etapa1: 500, planilhaInfra: "2026" });
    const fmt = (n: number) => String(n);
    expect(qtdTexto({ kind: "calc", key: "pocosVisita" }, r, fmt)).toBeNull();
    expect(qtdTexto({ kind: "calc", key: "drenagem" }, r, fmt)).not.toBeNull();
    const q = calcular({ areaTotal: 100000, metragemLote: 360, frenteLote: 12, aproveitamento: 0.5, valorM2Etapa1: 500, planilhaInfra: "2026", quadraMax: 100 });
    expect(q.infra.pocosVisita).toBeGreaterThan(0);
    expect(Number.isInteger(q.infra.bocaLobo)).toBe(true);
  });
});

describe("emoji padrão das benfeitorias", () => {
  it("escolhe pelo tipo do item", async () => {
    const { emojiPadrao } = await import("./formatos");
    expect(emojiPadrao("Piscina adulto e infantil")).toBe("🏊");
    expect(emojiPadrao("Academia ao ar livre")).toBe("💪");
    expect(emojiPadrao("<b>Quadra de beach tennis</b>")).toBe("🎾");
    expect(emojiPadrao("Praça central")).toBe("🌳");
    expect(emojiPadrao("Item qualquer")).toBe("✨");
  });
});

describe("obras do chacreamento aberto no condomínio", () => {
  const ab = FORMATOS_INICIAIS.chacreamento_aberto;
  const cc = FORMATOS_INICIAIS.chacreamento_condominio;

  it("o condomínio fica com as mesmas obras do aberto; benfeitorias e o resto continuam do condomínio", () => {
    const r = trocarObras(ab, cc);
    expect(r.infra).toEqual(ab.infra);
    expect(r.complementar).toEqual(ab.complementar);
    expect(r.benfeitorias).toEqual(cc.benfeitorias);
    expect([r.label, r.lei, r.modelo, r.padroes]).toEqual([cc.label, cc.lei, cc.modelo, cc.padroes]);
  });

  it("textos: os das obras do aberto entram, os das obras antigas do condomínio saem, os outros ficam", () => {
    const poco = ab.infra.find((i) => i.obra === "Poço artesiano")!;
    const velha = cc.infra[0].id;
    const bf = cc.benfeitorias[0].id;
    const r = trocarObras(
      { ...ab, overrides: { [`li.${poco.id}.desc`]: "Água do subsolo", "txt.a1": "do aberto" } },
      { ...cc, overrides: { [`li.${velha}.obra`]: "Velha", [`liq.${velha}`]: { kind: "fixa", text: "1" }, [`li.${bf}.texto`]: "Portaria", "txt.a1": "do condomínio" } },
    );
    expect(r.overrides).toEqual({ [`li.${poco.id}.desc`]: "Água do subsolo", [`li.${bf}.texto`]: "Portaria", "txt.a1": "do condomínio" });
  });
});
