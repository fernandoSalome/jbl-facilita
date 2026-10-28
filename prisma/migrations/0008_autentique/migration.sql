-- Assinatura da carta de intenção pela Autentique
ALTER TABLE "IntentLetter" ADD COLUMN "autentiqueId" TEXT;
ALTER TABLE "IntentLetter" ADD COLUMN "assinaturas" JSONB;
CREATE UNIQUE INDEX "IntentLetter_autentiqueId_key" ON "IntentLetter"("autentiqueId");
