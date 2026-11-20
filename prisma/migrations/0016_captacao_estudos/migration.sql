-- Captação, 2ª parte (pedido 19/11/2026): estudos 1 e 2, custos, pessoas, reunião, chat das conversas e biblioteca de cidades
-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "custos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "estudo1" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "estudo2" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "pessoas" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "reuniaoId" TEXT;

-- CreateTable
CREATE TABLE "AreaMensagem" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "deMim" BOOLEAN NOT NULL DEFAULT false,
    "texto" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT,

    CONSTRAINT "AreaMensagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "leis" TEXT NOT NULL,
    "mapa" TEXT,
    "conferidoEm" TIMESTAMP(3),
    "alerta" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AreaMensagem_areaId_quando_idx" ON "AreaMensagem"("areaId", "quando");

-- CreateIndex
CREATE INDEX "AreaMensagem_telefone_quando_idx" ON "AreaMensagem"("telefone", "quando");

-- CreateIndex
CREATE UNIQUE INDEX "Cidade_nome_uf_key" ON "Cidade"("nome", "uf");

-- AddForeignKey
ALTER TABLE "AreaMensagem" ADD CONSTRAINT "AreaMensagem_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS sem políticas, como nas outras tabelas
ALTER TABLE "AreaMensagem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cidade" ENABLE ROW LEVEL SECURITY;
