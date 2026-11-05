-- Página de apresentação de custos (fora da plataforma), com rascunho e versão publicada
CREATE TABLE "Apresentacao" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "textos" JSONB NOT NULL DEFAULT '{}',
    "formatos" JSONB NOT NULL DEFAULT '{}',
    "estilo" JSONB NOT NULL DEFAULT '{}',
    "publicado" JSONB,
    "publicadoEm" TIMESTAMP(3),
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Apresentacao_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Apresentacao_slug_key" ON "Apresentacao"("slug");
CREATE UNIQUE INDEX "Apresentacao_token_key" ON "Apresentacao"("token");
