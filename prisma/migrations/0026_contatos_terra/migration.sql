-- Contatos de terra (pedido 20/11/2026)
CREATE TABLE "ContatoTerra" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "situacao" TEXT NOT NULL DEFAULT 'pendente',
    "papel" TEXT,
    "resumo" TEXT,
    "ultimaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classificadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContatoTerra_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContatoTerra_telefone_key" ON "ContatoTerra"("telefone");
CREATE INDEX "ContatoTerra_situacao_ultimaEm_idx" ON "ContatoTerra"("situacao", "ultimaEm");

CREATE TABLE "MensagemParticular" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "deMim" BOOLEAN NOT NULL DEFAULT false,
    "texto" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT NOT NULL,
    CONSTRAINT "MensagemParticular_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MensagemParticular_messageId_key" ON "MensagemParticular"("messageId");
CREATE INDEX "MensagemParticular_telefone_quando_idx" ON "MensagemParticular"("telefone", "quando");

ALTER TABLE "ContatoTerra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MensagemParticular" ENABLE ROW LEVEL SECURITY;
