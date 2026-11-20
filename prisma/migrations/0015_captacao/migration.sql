-- Captação de áreas (pedido 19/11/2026): funil de áreas, checklist vivo, conversas ligadas e função dos grupos de WhatsApp
-- AlterTable
ALTER TABLE "WaGroup" ADD COLUMN     "funcao" TEXT;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'SP',
    "dono" TEXT,
    "corretor" TEXT,
    "hectares" DOUBLE PRECISION,
    "etapa" TEXT NOT NULL DEFAULT 'captacao',
    "situacao" TEXT NOT NULL DEFAULT 'ativa',
    "poligono" JSONB,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "documentos" JSONB NOT NULL DEFAULT '{}',
    "hipoteses" JSONB NOT NULL DEFAULT '[]',
    "conclusao" TEXT,
    "relatorio" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaConversa" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'proprietario',
    "nutrir" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaConversa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Area_situacao_etapa_idx" ON "Area"("situacao", "etapa");

-- CreateIndex
CREATE INDEX "AreaConversa_telefone_idx" ON "AreaConversa"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "AreaConversa_areaId_telefone_key" ON "AreaConversa"("areaId", "telefone");

-- AddForeignKey
ALTER TABLE "AreaConversa" ADD CONSTRAINT "AreaConversa_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS sem políticas, como nas outras tabelas: a API pública do Supabase não acessa nada
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AreaConversa" ENABLE ROW LEVEL SECURITY;
