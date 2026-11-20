import { describe, expect, it } from "vitest";
import { podeEnviar } from "./limite-whatsapp";

const t = (min: number) => new Date(Date.UTC(2026, 10, 20, 12, min));

describe("limite do WhatsApp", () => {
  it("deixa 2 em 15 minutos e barra a 3ª", () => {
    expect(podeEnviar([], t(0)).ok).toBe(true);
    expect(podeEnviar([t(0)], t(1)).ok).toBe(true);
    const r = podeEnviar([t(0), t(5)], t(6));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.libera).toEqual(t(15));
  });
  it("libera quando o envio mais antigo sai da janela", () => {
    expect(podeEnviar([t(0), t(5)], t(15)).ok).toBe(true);
    expect(podeEnviar([t(0), t(5), t(16)], t(17)).ok).toBe(false);
  });
});
