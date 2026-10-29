-- Proposta bloqueada para edição (só visualização) e quem bloqueou
ALTER TABLE "Proposal" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "Proposal" ADD COLUMN "lockedBy" TEXT;
