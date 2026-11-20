-- Lembretes pelo WhatsApp e resumo da manhã (pedido 20/11/2026)
-- CreateTable
CREATE TABLE "Lembrete" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL,
    "grupoJid" TEXT NOT NULL,
    "pedidoPor" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lembrete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaRotina" (
    "chave" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaRotina_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE INDEX "Lembrete_enviadoEm_quando_idx" ON "Lembrete"("enviadoEm", "quando");


-- RLS sem políticas, como nas outras tabelas
ALTER TABLE "Lembrete" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaRotina" ENABLE ROW LEVEL SECURITY;
