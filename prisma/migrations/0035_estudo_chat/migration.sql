-- Pedido 27/11/2026: chat ao lado do estudo (pergunta, e o que for combinado entra no estudo só com o "sim")
CREATE TABLE "EstudoMensagem" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "estudo" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "autor" TEXT,
    "texto" TEXT NOT NULL,
    "proposta" TEXT,
    "inclusao" TEXT,
    "comandoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstudoMensagem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstudoMensagem_areaId_estudo_createdAt_idx" ON "EstudoMensagem"("areaId", "estudo", "createdAt");
ALTER TABLE "EstudoMensagem" ENABLE ROW LEVEL SECURITY;
