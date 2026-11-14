-- Segurança (13/11/2026)

-- Tentativas de login com senha errada (limite contra quem tenta adivinhar a senha)
CREATE TABLE "LoginTentativa" (
    "chave" TEXT NOT NULL,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginTentativa_pkey" PRIMARY KEY ("chave")
);

-- Cartas de intenção são sempre procuradas pela proposta
CREATE INDEX "IntentLetter_proposalId_idx" ON "IntentLetter"("proposalId");

-- RLS em todas as tabelas, sem nenhuma política: a API pública do Supabase (PostgREST, papéis anon e
-- authenticated) não lê nem grava nada. O app usa o Prisma com o dono das tabelas, que não passa pelo RLS
-- (sem FORCE), então nada muda para ele. Só as tabelas cujo dono é quem roda a migração.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user LOOP
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', t.schemaname, t.tablename);
  END LOOP;
END $$;
