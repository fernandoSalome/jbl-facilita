-- Limite de envio do WhatsApp (pedido 20/11/2026: no máximo 2 mensagens a cada 15 minutos)
-- CreateTable
CREATE TABLE "WaEnvio" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaEnvio_em_idx" ON "WaEnvio"("em");


-- RLS sem políticas, como nas outras tabelas
ALTER TABLE "WaEnvio" ENABLE ROW LEVEL SECURITY;
