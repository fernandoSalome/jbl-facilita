-- Pedido 25/11/2026: modelo da minuta da SPE para o proprietário ver e baixar pelo passo a passo
CREATE TABLE "ModeloArquivo" (
    "chave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "dados" BYTEA NOT NULL,
    "atualizadoPor" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModeloArquivo_pkey" PRIMARY KEY ("chave")
);
ALTER TABLE "ModeloArquivo" ENABLE ROW LEVEL SECURITY;
