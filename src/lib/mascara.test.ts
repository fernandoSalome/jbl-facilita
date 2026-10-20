import { describe, expect, it } from "vitest";
import { CPF, mascarar, RG } from "./mascara";

describe("máscaras da carta de intenção", () => {
  it("CPF", () => {
    expect(mascarar("12345678901", CPF)).toBe("123.456.789-01");
    expect(mascarar("123.4", CPF)).toBe("123.4");
    expect(mascarar("123456789012345", CPF)).toBe("123.456.789-01");
  });
  it("RG com X no fim", () => {
    expect(mascarar("12345678x", RG)).toBe("12.345.678-X");
    expect(mascarar("123456789", RG)).toBe("12.345.678-9");
    expect(mascarar("12x3", RG)).toBe("12.3");
  });
  it("telefone celular e fixo", () => {
    const tel = (d: string) => (d.length > 10 ? "(00) 00000-0000" : "(00) 0000-0000");
    expect(mascarar("18999998888", tel)).toBe("(18) 99999-8888");
    expect(mascarar("1832221111", tel)).toBe("(18) 3222-1111");
  });
});
