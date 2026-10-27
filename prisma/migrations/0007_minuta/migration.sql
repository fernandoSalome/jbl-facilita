-- Minuta da carta de intenção e assinatura pelo gov.br
ALTER TABLE "IntentLetter" ADD COLUMN "minutaHtml" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "minutaStatus" TEXT NOT NULL DEFAULT 'revisao';
ALTER TABLE "IntentLetter" ADD COLUMN "minutaFinal" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "assinaturaToken" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "linkGeradoEm" TIMESTAMP(3);
ALTER TABLE "IntentLetter" ADD COLUMN "linkEnviadoEm" TIMESTAMP(3);
ALTER TABLE "IntentLetter" ADD COLUMN "codigoHash" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "codigoExpira" TIMESTAMP(3);
ALTER TABLE "IntentLetter" ADD COLUMN "codigoEnvios" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IntentLetter" ADD COLUMN "codigoTentativas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IntentLetter" ADD COLUMN "telefoneConfirmado" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "sessaoHash" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "sessaoExpira" TIMESTAMP(3);
ALTER TABLE "IntentLetter" ADD COLUMN "assinadaEm" TIMESTAMP(3);
ALTER TABLE "IntentLetter" ADD COLUMN "pdfAssinado" BYTEA;
ALTER TABLE "IntentLetter" ADD COLUMN "pdfAssinadoNome" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "assinante" TEXT;
CREATE UNIQUE INDEX "IntentLetter_assinaturaToken_key" ON "IntentLetter"("assinaturaToken");
