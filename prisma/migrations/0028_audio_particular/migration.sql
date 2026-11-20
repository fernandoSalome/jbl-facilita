-- Áudios das conversas particulares, transcritos na VPS (pedido 20/11/2026)
ALTER TABLE "MensagemParticular" ADD COLUMN "audioPendente" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "MensagemParticular_audioPendente_idx" ON "MensagemParticular"("audioPendente");
