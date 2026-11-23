import { describe, expect, it } from "vitest";
import * as icones from "lucide-react";
import { SECOES } from "./captacao";
import { FORMATO, opcoesDo } from "./checklist-formato";

describe("formato do checklist", () => {
  it("tem as 30 seções", () => expect(FORMATO.length).toBe(SECOES.length));
  it("cada seção tem todas as perguntas oficiais, uma vez só, e nenhuma a mais", () => {
    SECOES.forEach((s, k) => {
      const naTela = FORMATO[k].flatMap((g) => g.itens.map((x) => x.p));
      expect([...naTela].sort(), `seção ${k + 1}`).toEqual([...s.perguntas].sort());
    });
  });
  it("todo ícone existe e toda lista tem opções", () => {
    for (const g of FORMATO.flat()) {
      expect(icones[g.icone as keyof typeof icones], g.icone).toBeTruthy();
      for (const x of g.itens) if (["sel", "sn", "sna", "snp", "doc", "ap"].includes(x.tipo)) expect(opcoesDo(x).length, x.p).toBeGreaterThan(1);
    }
  });
});
