/**
 * Roda a cada deploy (é idempotente): garante o usuário administrador, o template
 * padrão e, num banco vazio, o loteamento de demonstração São Judas Tadeu II.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FORMATOS, FORMATOS_INICIAIS } from "../src/lib/formatos";

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
