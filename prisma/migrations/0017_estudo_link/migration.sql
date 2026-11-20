-- Link público do estudo de viabilidade para parceiros (pedido 19/11/2026)
-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "estudoLinkEm" TIMESTAMP(3),
ADD COLUMN     "estudoToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Area_estudoToken_key" ON "Area"("estudoToken");

