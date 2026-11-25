-- Pedido 25/11/2026: passo a passo da parceria para o proprietário acompanhar por link
ALTER TABLE "Area" ADD COLUMN "andamento" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Area" ADD COLUMN "andamentoToken" TEXT;
ALTER TABLE "Area" ADD COLUMN "andamentoLinkEm" TIMESTAMP(3);
CREATE UNIQUE INDEX "Area_andamentoToken_key" ON "Area"("andamentoToken");
