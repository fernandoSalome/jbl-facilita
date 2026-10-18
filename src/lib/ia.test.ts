import { describe, expect, it } from "vitest";
import { entenderTexto, projetoPorTexto, tipoPorTexto } from "./ia";

const P = [
  { id: "sj", name: "São Judas Tadeu II", municipio: "Martinópolis", uf: "SP" },
  { id: "lg", name: "Lagos", municipio: "Rio de Janeiro", uf: "RJ" },
];

describe("robô: entender mensagens", () => {
  it("acha o loteamento pelo nome ou pela cidade", () => {
    expect(projetoPorTexto("matrícula do São Judas", P)?.id).toBe("sj");
    expect(projetoPorTexto("segue a matricula de lagos", P)?.id).toBe("lg");
    expect(projetoPorTexto("documento de Martinópolis", P)?.id).toBe("sj");
    expect(projetoPorTexto("bom dia pessoal", P)).toBeNull();
  });
  it("acha o tipo do documento", () => {
    expect(tipoPorTexto("MATRICULA 14656.pdf")).toBe("matricula");
    expect(tipoPorTexto("CAR atualizado")).toBe("car");
    expect(tipoPorTexto("certidão de ônus")).toBe("certidao");
  });
  it("entende aviso, pedido e status", async () => {
    expect(await entenderTexto("Estou enviando a matrícula do São Judas", P)).toMatchObject({ acao: "aviso_envio", tipo: "matricula", projetoId: "sj" });
    expect(await entenderTexto("me manda a matrícula de Lagos", P)).toMatchObject({ acao: "pedido_documento", tipo: "matricula", projetoId: "lg" });
    expect(await entenderTexto("Quero a matricula do sao judas", P)).toMatchObject({ acao: "pedido_documento", projetoId: "sj" });
    expect(await entenderTexto("como está o São Judas?", P)).toMatchObject({ acao: "status", projetoId: "sj" });
    expect((await entenderTexto("bom dia", P)).acao).toBe("nada");
  });
});
