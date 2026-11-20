-- Fila de pedidos ao Claude da VPS pelo WhatsApp: pesquisas e estudos (pedido 20/11/2026)
-- CreateTable
CREATE TABLE "ComandoClaude" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "grupoJid" TEXT NOT NULL,
    "autor" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'pesquisa',
    "areaId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'fila',
    "resposta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciadoEm" TIMESTAMP(3),
    "terminadoEm" TIMESTAMP(3),
    "enviadoEm" TIMESTAMP(3),

    CONSTRAINT "ComandoClaude_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComandoClaude_status_createdAt_idx" ON "ComandoClaude"("status", "createdAt");


-- RLS sem políticas, como nas outras tabelas
ALTER TABLE "ComandoClaude" ENABLE ROW LEVEL SECURITY;
