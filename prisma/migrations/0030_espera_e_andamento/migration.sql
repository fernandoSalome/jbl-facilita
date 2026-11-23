-- Pedido 22/11/2026: andamento do estudo na tela e fila de espera das mensagens que passam do limite
ALTER TABLE "ComandoClaude" ADD COLUMN "progresso" INTEGER;
ALTER TABLE "ComandoClaude" ADD COLUMN "fase" TEXT;

CREATE TABLE "MensagemEspera" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),
    CONSTRAINT "MensagemEspera_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MensagemEspera_enviadoEm_createdAt_idx" ON "MensagemEspera"("enviadoEm", "createdAt");
ALTER TABLE "MensagemEspera" ENABLE ROW LEVEL SECURITY;
