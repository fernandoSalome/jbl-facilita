-- Pedido 25/11/2026: conversa no JBL - Central com memória de 90 dias, documentos em lote
ALTER TABLE "WaGroup" ADD COLUMN "conversa" JSONB;
ALTER TABLE "WaGroup" ADD COLUMN "conversaEm" TIMESTAMP(3);
ALTER TABLE "ProjectDocument" ADD COLUMN "avisadoEm" TIMESTAMP(3);

CREATE TABLE "MensagemCentral" (
    "id" TEXT NOT NULL,
    "grupoJid" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "autor" TEXT NOT NULL DEFAULT '',
    "deMim" BOOLEAN NOT NULL DEFAULT false,
    "texto" TEXT NOT NULL,
    "arquivo" TEXT,
    "quando" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MensagemCentral_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MensagemCentral_messageId_key" ON "MensagemCentral"("messageId");
CREATE INDEX "MensagemCentral_grupoJid_quando_idx" ON "MensagemCentral"("grupoJid", "quando");
ALTER TABLE "MensagemCentral" ENABLE ROW LEVEL SECURITY;
