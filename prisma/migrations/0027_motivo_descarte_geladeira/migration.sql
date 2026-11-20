-- Descarte e geladeira com motivo e prazo (pedido 20/11/2026)
ALTER TABLE "Area" ADD COLUMN "motivoDescarte" TEXT,
ADD COLUMN "descartadaEm" TIMESTAMP(3),
ADD COLUMN "motivoGeladeira" TEXT,
ADD COLUMN "geladeiraEm" TIMESTAMP(3),
ADD COLUMN "geladeiraAte" TIMESTAMP(3),
ADD COLUMN "geladeiraAvisoEm" TIMESTAMP(3);
