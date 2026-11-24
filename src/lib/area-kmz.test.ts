import { describe, expect, it } from "vitest";
import type { Resposta } from "./captacao";
import { checklistSemEstudo, ehModoTroca, etapaSemEstudo, haTexto } from "./area-kmz";

describe("trocar o KMZ da área", () => {
  it("apagar o estudo tira só o que veio dos estudos", () => {
    const r = (fonte: Resposta["fonte"]): Resposta => ({ secao: 1, pergunta: "p", resposta: "r", fonte, ref: "", em: "" });
    expect(checklistSemEstudo([r("raiox"), r("whatsapp"), r("raiox")]).map((x) => x.fonte)).toEqual(["whatsapp"]);
  });
  it("etapa e textos", () => {
    expect(etapaSemEstudo("previabilidade")).toBe("captacao");
    expect(etapaSemEstudo("reuniao")).toBe("reuniao");
    expect(ehModoTroca("manter")).toBe(true);
    expect(ehModoTroca("x")).toBe(false);
    expect(haTexto(7.456)).toBe("7,46 ha");
    expect(haTexto(null)).toBe("—");
  });
});
