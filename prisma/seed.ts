/**
 * Roda a cada deploy (é idempotente): garante o usuário administrador, o template
 * padrão e, num banco vazio, o loteamento de demonstração São Judas Tadeu II.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FORMATOS, FORMATOS_INICIAIS, juntar, mesclarComum, parseContent } from "../src/lib/formatos";

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
