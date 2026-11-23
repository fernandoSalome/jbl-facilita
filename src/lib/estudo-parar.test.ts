import { describe, expect, it } from "vitest";
import { guardadoAte, lerPedidoParada, podeRetomar, textoParou, textoPedidoParar } from "./estudo-parar";

describe("parar e retomar o estudo", () => {
  it("entende o pedido no WhatsApp", () => {
    expect(lerPedidoParada("para o estudo de Ipioca")).toBe("parar");
    expect(lerPedidoParada("Pare a viabilidade legal")).toBe("parar");
    expect(lerPedidoParada("cancela a análise de Sorocaba")).toBe("parar");
    expect(lerPedidoParada("retoma o estudo de Ipioca")).toBe("retomar");
    expect(lerPedidoParada("pode voltar a análise")).toBe("retomar");
    expect(lerPedidoParada("como está o estudo de Ipioca?")).toBeNull();
    expect(lerPedidoParada("parar")).toBeNull();
  });
  it("guarda por 5 dias", () => {
    const p = new Date(Date.UTC(2026, 10, 23, 15));
    expect(+guardadoAte(p) - +p).toBe(5 * 24 * 3600e3);
    expect(podeRetomar(p, new Date(Date.UTC(2026, 10, 28, 14)))).toBe(true);
    expect(podeRetomar(p, new Date(Date.UTC(2026, 10, 28, 16)))).toBe(false);
    expect(podeRetomar(null)).toBe(false);
  });
  it("textos", () => {
    expect(textoParou("Ipioca", "estudo", new Date(Date.UTC(2026, 10, 23, 15)))).toContain("guardado até 28/11");
    expect(textoPedidoParar("Ipioca", "estudo", true)).toContain("Confirmo aqui");
    expect(textoPedidoParar("Ipioca", "mercado", false)).toContain("Parei a Viabilidade Mercadológica");
  });
});
