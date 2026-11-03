import { describe, expect, it } from "vitest";
import { BLOCOS_CARTA, cartaMontada, faltandoNaCarta, limparConjuge, SEDE_ANTIGA, SEDE_JBL, semConjuge, SOCIO_JBL, valoresCarta } from "./carta";
import { minutaInicial } from "./minuta";

const projeto = { name: "Rancho Fundo", municipio: "Pontal", uf: "MT", matricula: null };

describe("carta de intenção editável", () => {
  it("sem edição usa o texto oficial com os dados", () => {
    const c = cartaMontada({}, { p_nome: "Bruna Stein", p_cpf: "123.456.789-00" }, projeto);
    expect(c.blocos).toHaveLength(BLOCOS_CARTA.length);
    expect(c.blocos[1].html).toContain("<strong>BRUNA STEIN</strong>");
    expect(c.blocos[1].html).toContain("CPF: n.º 123.456.789-00");
    expect(c.blocos[1].html).toContain('<span class="lacuna">[RG]</span>');
  });

  it("texto editado mantém os campos e escapa o que a pessoa digitou", () => {
    const c = cartaMontada({ "carta.i2": "html:Atua em todo o Brasil. Proprietário: <strong>{{p_nome}}</strong>{{inexistente}}" }, { p_nome: "Ana <b>" }, projeto);
    const i2 = c.blocos[BLOCOS_CARTA.findIndex((b) => b.k === "carta.i2")].html;
    expect(i2).toBe("Atua em todo o Brasil. Proprietário: <strong>Ana &lt;b&gt;</strong>");
  });

  it("trechos opcionais vazios não aparecem como texto", () => {
    const v = valoresCarta({}, projeto);
    expect(v.casamento).toContain("var-vazia");
    expect(v.casamento.replace(/<[^>]+>/g, "")).toBe("");
    expect(v.situado).toBe("na Gleba Rancho Fundo");
  });

  it("dados do sócio da JBL só na minuta; na proposta ficam lacunas (também em texto editado antes)", () => {
    const proposta = cartaMontada({}, {}, projeto).blocos[1].html;
    expect(proposta).not.toContain("Felipe");
    expect(proposta).not.toContain("104.945.466-97");
    expect(proposta).toContain('<span class="lacuna">[nome]</span>');
    expect(proposta).toContain("58.521.773/0001-01");
    const minuta = minutaInicial({}, projeto, new Date("2026-10-28T12:00:00"));
    expect(minuta).toContain(SOCIO_JBL);
    const editado = { "carta.partes": `html:Texto editado com ${SOCIO_JBL} no meio.` };
    expect(cartaMontada(editado, {}, projeto).blocos[1].html).not.toContain("Felipe");
    expect(cartaMontada(editado, {}, projeto, undefined, { minuta: true }).blocos[1].html).toContain(SOCIO_JBL);
  });

  it("sede: a matriz em Barueri na carta e na minuta (texto editado com a sede antiga também muda)", () => {
    expect(cartaMontada({}, {}, projeto).blocos[1].html).toContain(SEDE_JBL);
    expect(minutaInicial({}, projeto, new Date("2026-10-28T12:00:00"))).toContain(SEDE_JBL);
    const editado = { "carta.partes": `html:Sede na ${SEDE_ANTIGA}.` };
    expect(cartaMontada(editado, {}, projeto).blocos[1].html).toBe(`Sede na ${SEDE_JBL}.`);
  });
});

describe("carta de intenção: obrigatórios e cônjuge", () => {
  const prop = { nome: "Ana", cpf: "123.456.789-00", rg: "12.345.678-9", nacionalidade: "brasileira", profissao: "médica", nascimento: "1980-01-01", naturalidade: "Pontal/MT", endereco: "Rua A, 1" };
  const conj = { nome: "Beto", cpf: "987.654.321-00", rg: "1", nacionalidade: "brasileiro", profissao: "x", nascimento: "1980-01-01", naturalidade: "y" };
  const cas = { data: "2000-01-01", regime: "Comunhão parcial de bens", matricula: "1", rcpn: "2", municipio: "3" };

  it("solteiro, divorciado e viúvo não têm cônjuge", () => {
    for (const e of ["Solteiro(a)", "Divorciado(a)", "Viúvo(a)"]) expect(semConjuge(e)).toBe(true);
    for (const e of ["Casado(a)", "União estável", ""]) expect(semConjuge(e)).toBe(false);
  });

  it("solteiro: só os dados do proprietário são obrigatórios", () => {
    expect(faltandoNaCarta({ proprietario: prop, casamento: { estadoCivil: "Solteiro(a)" } })).toEqual([]);
  });

  it("casado: a seção 02 inteira é obrigatória", () => {
    const f = faltandoNaCarta({ proprietario: prop, casamento: { estadoCivil: "Casado(a)" }, conjuge: {} }).map((x) => x.k);
    expect(f).toEqual(expect.arrayContaining(["c_data", "c_regime", "j_nome", "j_cpf", "j_natural"]));
    expect(faltandoNaCarta({ proprietario: prop, casamento: { estadoCivil: "União estável", ...cas }, conjuge: conj })).toEqual([]);
  });

  it("sem estado civil e com CPF incompleto: aponta", () => {
    const f = faltandoNaCarta({ proprietario: { ...prop, cpf: "123" }, casamento: {} }).map((x) => x.k);
    expect(f).toContain("estado_civil");
    expect(f).toContain("p_cpf");
    expect(f).toContain("j_nome");
  });

  it("limparConjuge apaga a seção 02 só sem cônjuge", () => {
    expect(limparConjuge({ estado_civil: "Viúvo(a)", j_nome: "Beto" }).j_nome).toBe("");
    expect(limparConjuge({ estado_civil: "Casado(a)", j_nome: "Beto" }).j_nome).toBe("Beto");
  });
});
