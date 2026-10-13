/**
 * Roda a cada deploy (é idempotente): garante o usuário administrador, o template
 * padrão e, num banco vazio, o loteamento de demonstração São Judas Tadeu II.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

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

  if ((await db.project.count()) === 0) {
    const admin = await db.user.findUniqueOrThrow({ where: { email } });
    const project = await db.project.create({
      data: {
        name: "São Judas Tadeu II",
        municipio: "Martinópolis",
        uf: "SP",
        matricula: "14.656",
        areaTotal: 137338.46,
        aerialImage: "/demo/sao-judas-tadeu-ii.jpg",
        fase: "proposta",
      },
    });
    // Mesmas premissas usadas no PDF de jan/2026 (VGV global R$ 188.015.858,21)
    await db.proposal.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        name: "Parceria 35% · 20 anos",
        ownerName: "Família",
        inputs: {
          areaTotal: 137338.46, aproveitamento: 0.5, metragemLote: 200, frenteLote: 8, valorM2: 500, corretorPct: 0.06, entradaPct: 0.05,
          ipca: 0.04, jurosMes: 0.0067, reajusteManual: 0.12, multiplicador: 1.6, anos: 20, incorporadorPct: 0.65, custoInfraM2: 145,
        },
        options: { cartaIntencao: true, validadeDias: 15 },
        status: "enviada",
        publicToken: randomBytes(9).toString("base64url"),
        publishedAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 864e5),
        createdById: admin.id,
      },
    });
    console.log("Loteamento de demonstração criado.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
