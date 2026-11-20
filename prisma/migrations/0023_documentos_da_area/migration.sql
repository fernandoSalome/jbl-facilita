-- Documentos e contexto das áreas da Captação no robô do WhatsApp (pedido 20/11/2026)
-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "WaGroup" ADD COLUMN     "contextoAreaAt" TIMESTAMP(3),
ADD COLUMN     "contextoAreaId" TEXT;

CREATE INDEX "ProjectDocument_areaId_idx" ON "ProjectDocument"("areaId");
