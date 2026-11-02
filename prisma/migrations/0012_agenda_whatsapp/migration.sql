-- Avisos do calendário no grupo de WhatsApp de monitoramento: quando cada aviso saiu (vazio = ainda não)
ALTER TABLE "Compromisso" ADD COLUMN "waMarcadoEm" TIMESTAMP(3);
ALTER TABLE "Compromisso" ADD COLUMN "waDiaEm" TIMESTAMP(3);
ALTER TABLE "Compromisso" ADD COLUMN "waHoraEm" TIMESTAMP(3);
ALTER TABLE "Compromisso" ADD COLUMN "waErro" TEXT;
