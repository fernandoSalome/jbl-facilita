import { describe, expect, it } from "vitest";
import { JANELA_MANUAL_MS, LIMITE_MANUAL, podeEnviar } from "./limite-whatsapp";

const t = (min: number) => new Date(Date.UTC(2026, 10, 20, 12, min));

describe("limite do WhatsApp", () => {
  it("deixa 1 a cada 10 minutos e barra a 2ª", () => {
    expect(podeEnviar([], t(0)).ok).toBe(true);
    const r = podeEnviar([t(0)], t(4));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.libera).toEqual(t(10));
  });
  it("libera quando o envio sai da janela", () => {
    expect(podeEnviar([t(0)], t(10)).ok).toBe(true);
    expect(podeEnviar([t(0), t(11)], t(12)).ok).toBe(false);
  });
  it("as digitadas na tela seguem 20 a cada 15 minutos", () => {
    const vinte = Array.from({ length: 20 }, (_, i) => t(i * 0.5));
    expect(podeEnviar(vinte.slice(0, 19), t(10), LIMITE_MANUAL, JANELA_MANUAL_MS).ok).toBe(true);
    expect(podeEnviar(vinte, t(10), LIMITE_MANUAL, JANELA_MANUAL_MS).ok).toBe(false);
  });
});
