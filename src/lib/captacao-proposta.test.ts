import { describe, expect, it } from "vitest";
import { entradasDaArea, formatoDaArea } from "./captacao-proposta";

describe("proposta a partir da área", () => {
  it("formato pelo produto", () => {
    expect(formatoDaArea("Loteamento aberto de lotes de 300 m²")).toBe("loteamento_aberto");
    expect(formatoDaArea("Condomínio fechado de lotes")).toBe("condominio_urbano");
    expect(formatoDaArea("Chácaras (lote de 4.000 m²)")).toBe("chacreamento_aberto");
  });
  it("Sorocaba: 300 m² / 12 m, 167 lotes, R$ 750–900/m²", () => {
    const r = entradasDaArea(
      { hectares: 21.4031, estudo1: { loteMinimo: "300 m² / 12 m", lotes: { medio: 167 } }, estudo2: { produto: "Loteamento aberto de lotes de 300 m², R$ 750–900/m² (R$ 225–270 mil)" } },
      { metragemLote: 200, frenteLote: 8, aproveitamento: 0.5 },
    );
    expect(r).toEqual({ areaTotal: 214031, metragemLote: 300, frenteLote: 12, aproveitamento: 0.234, valorM2: 825 });
  });
  it("sem estudo fica o padrão do formato", () => {
    expect(entradasDaArea({ hectares: null, estudo1: {}, estudo2: {} }, { metragemLote: 200, frenteLote: 8, aproveitamento: 0.5 })).toEqual({ metragemLote: 200, frenteLote: 8, aproveitamento: 0.5 });
  });
});
