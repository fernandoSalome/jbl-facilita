-- Mensagens digitadas na tela de Conversas: limite próprio (pedido 20/11/2026)
ALTER TABLE "WaEnvio" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
