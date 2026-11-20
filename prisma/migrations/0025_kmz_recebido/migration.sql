-- KMZ recebidos no particular, guardados sem resposta (pedido 20/11/2026)
-- CreateTable
CREATE TABLE "KmzRecebido" (
    "id" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT,
    "fileName" TEXT NOT NULL,
    "poligono" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "hectares" DOUBLE PRECISION,
    "cidade" TEXT,
    "uf" TEXT,
    "messageId" TEXT NOT NULL,
    "areaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KmzRecebido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KmzRecebido_messageId_key" ON "KmzRecebido"("messageId");

-- CreateIndex
CREATE INDEX "KmzRecebido_hash_idx" ON "KmzRecebido"("hash");


-- RLS sem políticas, como nas outras tabelas
ALTER TABLE "KmzRecebido" ENABLE ROW LEVEL SECURITY;
