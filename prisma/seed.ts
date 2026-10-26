/**
 * Roda a cada deploy (é idempotente): garante o usuário administrador, o template
 * padrão e, num banco vazio, o loteamento de demonstração São Judas Tadeu II.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FORMATOS, FORMATOS_INICIAIS, juntar, mesclarComum, parseContent, separarEmoji, type QtdCalcKey } from "../src/lib/formatos";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@jbl.com.br").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    if (!password) throw new Error("Defina ADMIN_PASSWORD para criar o administrador.");
    await db.user.create({
      data: { email, name: process.env.ADMIN_NAME ?? "Marcelo Aguilar", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Administrador criado: ${email}`);
  }

  let template = await db.template.findFirst({ where: { key: "jbl-padrao" } });
  if (!template) {
    template = await db.template.create({
      data: {
        key: "jbl-padrao",
        name: "Proposta JBL padrão",
        description: "Site da proposta com carta, números do estudo, divisão, recebimentos e carta de intenção.",
      },
    });
  }

  // Cada formato precisa de pelo menos uma versão no template base (listas dos Words oficiais)
  for (const f of FORMATOS) {
    const has = await db.formatoVersion.findFirst({ where: { templateId: template.id, formato: f } });
    if (!has) {
      await db.formatoVersion.create({ data: { templateId: template.id, formato: f, content: FORMATOS_INICIAIS[f] as object } });
      console.log(`Formato criado no template: ${f}`);
    }
  }
  // Sem loteamento de demonstração: os loteamentos são cadastrados no portal

  // Propostas sem versão (criadas antes dos formatos) ficam com a versão atual do seu formato
  const semVersao = await db.proposal.findMany({ where: { formatoVersionId: null }, select: { id: true, templateId: true, formato: true } });
  for (const p of semVersao) {
    const v = await db.formatoVersion.findFirst({ where: { templateId: p.templateId, formato: p.formato }, orderBy: { createdAt: "desc" } });
    if (v) await db.proposal.update({ where: { id: p.id }, data: { formatoVersionId: v.id } });
  }

  await unificarTextos();
  await muroDoChacreamentoCondominio();
  await infraPelaPlanilha();
  await planilha2026NoChacreamentoAberto();
  await planilha2026EmTodos();
}

/**
 * A planilha nova (JBL Planilha Infla, 2026) vira a regra em todos os tipos de loteamento:
 * marca a versão atual de cada tipo com as fórmulas de 2026 e passa a calcular os itens que
 * ela calcula e estavam "A projetar" (calçadas, reservatório, casa química, rede de drenagem,
 * poços de visita, bocas de lobo, bigode). A ligação de esgoto passa a ter a conta própria
 * (rua + 4 m por lote). Os textos não mudam. Leva todas as propostas do tipo para a versão
 * nova (o que foi ajustado em cada proposta continua por cima). Roda uma vez só.
 */
async function planilha2026EmTodos() {
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/<[^>]+>/g, " ");
  const REGRAS: [RegExp, QtdCalcKey][] = [
    [/^\s*calcadas/, "calcadas"],
    [/reservatorio de agua/, "reservatorio"],
    [/casa quimica/, "casaQuimica"],
    [/rede de drenagem/, "drenagem"],
    [/pocos? de visita/, "pocosVisita"],
    [/boca de lobo/, "bocaLobo"],
    [/bigode/, "bigode"],
  ];
  const templates = await db.template.findMany({ where: { key: "jbl-padrao" } });
  for (const t of templates) {
    for (const f of FORMATOS) {
      const atual = await db.formatoVersion.findFirst({ where: { templateId: t.id, formato: f }, orderBy: { createdAt: "desc" } });
      if (!atual) continue;
      const marcado = (atual.content as { planilha?: unknown } | null)?.planilha === "2026";
      const c = parseContent(atual.content, f);
      const trocados: string[] = [];
      const ajustar = <T extends { id: string; obra: string; qtd: { kind: string; key?: string; label?: string } }>(itens: T[]) =>
        itens.map((it) => {
          const ov = c.overrides[`li.${it.id}.obra`];
          const nome = sem(typeof ov === "string" ? ov.replace(/^html:/, "") : it.obra);
          if (it.qtd.kind === "calc" && it.qtd.key === "ligacoes" && /esgoto/.test(nome) && !/agua/.test(nome)) {
            trocados.push(`${it.obra} → ligacoesEsgoto`);
            return { ...it, qtd: { kind: "calc", key: "ligacoesEsgoto" } };
          }
          if (it.qtd.kind !== "projetar" || it.qtd.label) return it;
          const regra = REGRAS.find(([re]) => re.test(nome));
          if (!regra) return it;
          trocados.push(`${it.obra} → ${regra[1]}`);
          return { ...it, qtd: { kind: "calc", key: regra[1] } };
        });
      const infra = ajustar(c.infra);
      const complementar = ajustar(c.complementar);
      if (marcado && !trocados.length) continue;
      const v = await db.formatoVersion.create({ data: { templateId: t.id, formato: f, content: { ...c, planilha: "2026", infra, complementar } as object } });
      const n = await db.proposal.updateMany({ where: { templateId: t.id, formato: f }, data: { formatoVersionId: v.id } });
      console.log(`Planilha 2026 (${f}): ${trocados.join("; ") || "nenhum item convertido"} · ${n.count} proposta(s)`);
    }
  }
}

/**
 * Chacreamento aberto passa a usar as fórmulas de obra da planilha nova (JBL Planilha Infla, 2026):
 * rede elétrica = comprimento das vias, ligação de água = (rua + 3) × lotes, calçadas = vias − rua,
 * reservatório = 1 a cada 100 lotes, casa química = 1. Calçadas, reservatório e casa química, que
 * estavam "A projetar", passam a ser calculados. Só este tipo de loteamento. Roda uma vez só.
 */
async function planilha2026NoChacreamentoAberto() {
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/<[^>]+>/g, " ");
  const REGRAS: [RegExp, "calcadas" | "reservatorio" | "casaQuimica"][] = [
    [/^calcadas/, "calcadas"],
    [/reservatorio de agua/, "reservatorio"],
    [/casa quimica/, "casaQuimica"],
  ];
  const templates = await db.template.findMany({ where: { key: "jbl-padrao" } });
  for (const t of templates) {
    const atual = await db.formatoVersion.findFirst({ where: { templateId: t.id, formato: "chacreamento_aberto" }, orderBy: { createdAt: "desc" } });
    if (!atual) continue;
    const c = parseContent(atual.content, "chacreamento_aberto");
    if (c.planilha === "2026") continue;
    const trocados: string[] = [];
    const ajustar = <T extends { id: string; obra: string; qtd: { kind: string; label?: string } }>(itens: T[]) =>
      itens.map((it) => {
        if (it.qtd.kind !== "projetar" || it.qtd.label) return it;
        const ov = c.overrides[`li.${it.id}.obra`];
        const nome = sem(typeof ov === "string" ? ov.replace(/^html:/, "") : it.obra);
        const regra = REGRAS.find(([re]) => re.test(nome));
        if (!regra) return it;
        trocados.push(`${it.obra} → ${regra[1]}`);
        return { ...it, qtd: { kind: "calc", key: regra[1] } };
      });
    const content = { ...c, planilha: "2026", infra: ajustar(c.infra), complementar: ajustar(c.complementar) };
    const v = await db.formatoVersion.create({ data: { templateId: t.id, formato: "chacreamento_aberto", content: content as object } });
    const n = await db.proposal.updateMany({ where: { templateId: t.id, formato: "chacreamento_aberto" }, data: { formatoVersionId: v.id } });
    console.log(`Chacreamento aberto com a planilha 2026: ${trocados.join("; ") || "nenhum item convertido"} · ${n.count} proposta(s)`);
  }
}

/**
 * Itens de obra que estavam "A projetar", mas que a aba Custo da planilha calcula pelos dados
 * do parcelamento: passam a ser calculados (em todos os tipos de loteamento). Os outros itens
 * (poço, reservatório, drenagem, construção civil…) continuam "A projetar": a planilha não tem
 * conta para eles. Cria uma versão nova do template de cada tipo que mudou e leva todas as
 * propostas desse tipo para ela (o que foi ajustado em cada proposta continua por cima).
 * Roda uma vez só: depois de convertidos, não há mais o que trocar.
 */
async function infraPelaPlanilha() {
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/<[^>]+>/g, " ");
  const REGRAS: [RegExp, "logradouros" | "rede" | "ligacoes" | "eletrica" | "arvores"][] = [
    [/abertura de logradouros/, "logradouros"], // F57: área das ruas
    [/pavimentac/, "logradouros"], // F57
    [/rede principal de (agua|esgoto)/, "rede"], // F58: comprimento das vias
    [/ligac(ao|oes)( de)?( rede)?( de)? (agua|esgoto)/, "ligacoes"], // F59
    [/rede eletrica/, "eletrica"], // F60
    [/plantio de arvores/, "arvores"], // O40: um por lote
  ];
  const templates = await db.template.findMany({ where: { key: "jbl-padrao" } });
  for (const t of templates) {
    for (const f of FORMATOS) {
      const atual = await db.formatoVersion.findFirst({ where: { templateId: t.id, formato: f }, orderBy: { createdAt: "desc" } });
      if (!atual) continue;
      const c = parseContent(atual.content, f);
      const trocados: string[] = [];
      const ajustar = <T extends { id: string; obra: string; qtd: { kind: string; label?: string } }>(itens: T[]) =>
        itens.map((it) => {
          if (it.qtd.kind !== "projetar" || it.qtd.label) return it;
          const ov = c.overrides[`li.${it.id}.obra`];
          const nome = sem(typeof ov === "string" ? ov.replace(/^html:/, "") : it.obra);
          const regra = REGRAS.find(([re]) => re.test(nome));
          if (!regra) return it;
          trocados.push(`${it.obra} → ${regra[1]}`);
          return { ...it, qtd: { kind: "calc", key: regra[1] } };
        });
      const infra = ajustar(c.infra);
      const complementar = ajustar(c.complementar);
      if (!trocados.length) continue;
      const v = await db.formatoVersion.create({ data: { templateId: t.id, formato: f, content: { ...c, infra, complementar } as object } });
      const n = await db.proposal.updateMany({ where: { templateId: t.id, formato: f }, data: { formatoVersionId: v.id } });
      console.log(`Obras pela planilha (${f}): ${trocados.join("; ")} · ${n.count} proposta(s)`);
    }
  }
}

/**
 * Chacreamento em condomínio: o item do muro passa a ter o texto do documento oficial,
 * em versão compacta. Só neste tipo de loteamento. Cria uma versão nova do template e
 * leva para ela as propostas que estavam na versão atual (as que estavam numa versão
 * anterior continuam nela, com o aviso de template desatualizado). Roda uma vez só:
 * se o texto novo já estiver lá, não faz nada.
 */
async function muroDoChacreamentoCondominio() {
  const NOVO = "Muro frontal imponente de alvenaria (pilares em relevo e chapéus de concreto) e portões de ferro estilo colonial";
  const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/<[^>]+>/g, " ");
  const templates = await db.template.findMany({ where: { key: "jbl-padrao" } });
  for (const t of templates) {
    const atual = await db.formatoVersion.findFirst({ where: { templateId: t.id, formato: "chacreamento_condominio" }, orderBy: { createdAt: "desc" } });
    if (!atual) continue;
    const c = parseContent(atual.content, "chacreamento_condominio");
    const textoDe = (b: { id: string; texto: string }) => {
      const ov = c.overrides[`li.${b.id}.texto`];
      return typeof ov === "string" ? ov.replace(/^html:/, "") : b.texto;
    };
    const item = c.benfeitorias.find((b) => /muro frontal/.test(sem(textoDe(b))));
    if (!item || /pilares em relevo/.test(sem(textoDe(item)))) continue;
    // o emoji continua o do item (fica à parte do texto)
    const emoji = item.emoji ?? separarEmoji(item.texto).emoji ?? undefined;
    const content = {
      ...c,
      benfeitorias: c.benfeitorias.map((b) => (b.id === item.id ? { ...b, texto: NOVO, ...(emoji ? { emoji } : {}) } : b)),
      overrides: { ...c.overrides, [`li.${item.id}.texto`]: NOVO },
    };
    const v = await db.formatoVersion.create({ data: { templateId: t.id, formato: "chacreamento_condominio", content: content as object } });
    const n = await db.proposal.updateMany({ where: { templateId: t.id, formato: "chacreamento_condominio", formatoVersionId: atual.id }, data: { formatoVersionId: v.id } });
    console.log(`Chacreamento condomínio: texto do muro atualizado (versão ${v.id}, ${n.count} proposta(s))`);
  }
}

/**
 * Textos compartilhados entre os tipos de loteamento. Antes cada formato tinha os seus;
 * agora só listas, lei e padrões mudam por tipo. Quando as versões mais recentes dos 4
 * formatos têm textos diferentes, junta tudo (o alterado em um vale para todos; no mesmo
 * texto alterado em dois formatos, vale o mais recente), cria uma versão nova de cada
 * formato e coloca todas as propostas nela. Os textos personalizados de cada proposta
 * continuam por cima. Nada é apagado: as versões antigas ficam guardadas.
 */
async function unificarTextos() {
  const templates = await db.template.findMany({ where: { key: "jbl-padrao" } });
  for (const t of templates) {
    const versoes = [];
    for (const f of FORMATOS) {
      const v = await db.formatoVersion.findFirst({ where: { templateId: t.id, formato: f }, orderBy: { createdAt: "desc" } });
      if (v) versoes.push({ formato: f, content: parseContent(v.content, f), createdAt: v.createdAt });
    }
    if (versoes.length !== FORMATOS.length) continue;
    const m = mesclarComum(versoes);
    if (m.iguais) continue;

    for (const f of FORMATOS) {
      const content = { ...juntar(m.comum, m.tipos[f]), ...(m.conflitos.length ? { conflitos: m.conflitos } : {}) };
      const v = await db.formatoVersion.create({ data: { templateId: t.id, formato: f, content: content as object } });
      const n = await db.proposal.updateMany({ where: { templateId: t.id, formato: f }, data: { formatoVersionId: v.id } });
      console.log(`Textos unificados: ${f} → versão ${v.id} (${n.count} proposta(s))`);
    }
    console.log(`Template "${t.name}": ${Object.keys(m.comum.overrides).length} texto(s) compartilhado(s), ${m.conflitos.length} diferente(s) entre os tipos`);
    for (const c of m.conflitos) console.log(`  ${c.k}: valeu o de ${c.escolhido} (havia em ${c.opcoes.map((o) => o.formato).join(", ")})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
