import { describe, expect, it } from "vitest";
import { lerEstudo1 } from "./captacao-estudos";
import { conversaMd, estudoDoChat, imagensDo, lerPedidoChat, lerPergunta, promptChat, relatorioDoChat, textoDoPedido } from "./estudo-chat";

describe("chat do estudo", () => {
  it("pergunta: vazia ou longa demais não vale", () => {
    expect(lerPergunta("  dá condomínio?  ")).toBe("dá condomínio?");
    expect(lerPergunta("   ")).toBeNull();
    expect(lerPergunta("x".repeat(4001))).toBeNull();
  });

  it("pedido da fila vai e volta; texto estranho é recusado", () => {
    const p = { modo: "incluir", estudo: "mercado", mensagemId: "abc" } as const;
    expect(lerPedidoChat(textoDoPedido(p))).toEqual(p);
    expect(lerPedidoChat('{"modo":"apagar","estudo":"estudo","mensagemId":"a"}')).toBeNull();
    expect(lerPedidoChat("Viabilidade Legal do KMZ")).toBeNull();
  });

  it("conversa em Markdown diz se a equipe aceitou incluir", () => {
    const md = conversaMd([
      { papel: "eu", autor: "Fernando", texto: "Dá condomínio?", proposta: null, inclusao: null, createdAt: new Date("2026-11-27T12:00:00Z") },
      { papel: "claude", autor: null, texto: "Dá, na ZREU-1.", proposta: "Seção 7: incluir condomínio", inclusao: "nao", createdAt: new Date("2026-11-27T12:01:00Z") },
    ]);
    expect(md).toContain("### Fernando");
    expect(md).toContain("Proposta de mudança no estudo: Seção 7");
    expect(md).toContain("não incluir");
  });

  it("na pergunta o Claude não altera o estudo; no incluir grava o estudo novo", () => {
    const base = { estudo: "estudo" as const, pasta: "chat/a1-estudo", pastaEstudo: "trabalho/c1", pergunta: "Dá condomínio?" };
    expect(promptChat({ ...base, modo: "pergunta" })).toContain("NÃO altere relatorio.json");
    expect(promptChat({ ...base, modo: "pergunta" })).toContain("trabalho/c1/");
    const inc = promptChat({ ...base, modo: "incluir", proposta: "Seção 7: incluir condomínio" });
    expect(inc).toContain("relatorio-novo.json");
    expect(inc).toContain("Seção 7: incluir condomínio");
  });

  it("relatório devolvido: limpa HTML perigoso, recusa imagem nova e bloco desconhecido", () => {
    const antes = { titulo: "T", lede: "", veredito: "", destaque: "", secoes: [{ titulo: "S", blocos: [{ t: "img" as const, img: "/api/assets/x1", legenda: "mapa" }] }] };
    const r = relatorioDoChat(
      {
        titulo: "Estudo <b>novo</b>",
        secoes: [
          { titulo: "Zona", blocos: [{ t: "p", html: "ok <script>alert(1)</script><b>forte</b>" }, { t: "img", img: "https://mal.com/x.png" }, { t: "img", img: "/api/assets/x1", legenda: "mapa" }, { t: "iframe", src: "x" }] },
          { titulo: "Vazia", blocos: [] },
        ],
      },
      imagensDo(antes),
    );
    expect(r?.titulo).toBe("Estudo novo");
    expect(r?.secoes).toHaveLength(1);
    expect(r?.secoes[0].blocos).toHaveLength(2);
    const p = r?.secoes[0].blocos[0];
    expect(p && p.t === "p" && p.html).not.toContain("script");
    expect(relatorioDoChat({ titulo: "", secoes: [] }, new Set())).toBeNull();
  });

  it("campos do formulário: mudam os do Claude, ficam o andamento e o voltar ao original", () => {
    const antes = { status: "perguntado", zona: "ZREU-1", loteMinimo: "250 m²", originais: { zona: "ZR" } };
    const e = estudoDoChat("estudo", antes, { zona: "ZREU-1 · EDD-2 (escolher)", status: "sim", originais: {} }) as ReturnType<typeof lerEstudo1>;
    expect(e.zona).toBe("ZREU-1 · EDD-2 (escolher)");
    expect(e.loteMinimo).toBe("250 m²");
    expect(e.status).toBe("perguntado");
    expect(e.originais).toEqual({ zona: "ZR" });
  });
});
