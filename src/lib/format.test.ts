import { describe, expect, it } from "vitest";
import { extensoReais } from "./format";

describe("extensoReais", () => {
  it("escreve valores por extenso", () => {
    expect(extensoReais(9957005)).toBe("Nove milhões, novecentos e cinquenta e sete mil e cinco reais");
    expect(extensoReais(100000)).toBe("Cem mil reais");
    expect(extensoReais(2000000)).toBe("Dois milhões de reais");
    expect(extensoReais(1001)).toBe("Mil e um reais");
    expect(extensoReais(1250.5)).toBe("Mil, duzentos e cinquenta reais e cinquenta centavos");
    expect(extensoReais(1)).toBe("Um real");
  });
});
