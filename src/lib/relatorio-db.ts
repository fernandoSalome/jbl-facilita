import type { Prisma, PrismaClient } from "@prisma/client";
import { comImagens, lerRelatorio } from "./relatorio";

const MAX_IMG = 4 * 1024 * 1024;

/**
 * Guarda o raio-x completo na área: as imagens viram Asset (arquivadas, para não aparecer no banco de imagens,
 * mas servidas em /api/assets/<id>, com id que não dá para adivinhar) e os blocos vão para relatorioCompleto.
 * Recebe o cliente do banco para servir também ao seed.
 */
export async function guardarRelatorio(db: PrismaClient, areaId: string, html: string) {
  const lido = lerRelatorio(html);
  if (!lido) throw new Error("Não reconheci o raio-x nesse arquivo (precisa ter título e seções)");
  const urls: string[] = [];
  for (const [i, im] of lido.imagens.entries()) {
    const data = Buffer.from(im.base64, "base64");
    if (data.length > MAX_IMG) {
      urls.push("");
      continue;
    }
    const a = await db.asset.create({ data: { name: `raio-x-${areaId}-${i + 1}`, mime: im.mime, size: data.length, data, deletedAt: new Date() } });
    urls.push(`/api/assets/${a.id}`);
  }
  const relatorio = comImagens(lido.relatorio, urls);
  await db.area.update({ where: { id: areaId }, data: { relatorioCompleto: relatorio as unknown as Prisma.InputJsonValue } });
  return { secoes: relatorio.secoes.length, imagens: urls.filter(Boolean).length };
}
