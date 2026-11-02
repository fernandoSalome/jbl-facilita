-- Calendário (parecido com o Calendly): configuração por pessoa e compromissos
CREATE TABLE "AgendaConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL DEFAULT 'Reunião com a JBL',
    "descricao" TEXT,
    "duracaoMin" INTEGER NOT NULL DEFAULT 30,
    "antecedenciaH" INTEGER NOT NULL DEFAULT 2,
    "diasFrente" INTEGER NOT NULL DEFAULT 30,
    "horarios" JSONB NOT NULL,
    "local" TEXT,
    "googleEmail" TEXT,
    "googleRefresh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgendaConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgendaConfig_userId_key" ON "AgendaConfig"("userId");
CREATE UNIQUE INDEX "AgendaConfig_slug_key" ON "AgendaConfig"("slug");
ALTER TABLE "AgendaConfig" ADD CONSTRAINT "AgendaConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Compromisso" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'reuniao',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "convidadoNome" TEXT,
    "convidadoEmail" TEXT,
    "convidadoTel" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'interno',
    "status" TEXT NOT NULL DEFAULT 'marcado',
    "cancelToken" TEXT NOT NULL,
    "smsId" TEXT,
    "smsErro" TEXT,
    "emailErro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Compromisso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Compromisso_cancelToken_key" ON "Compromisso"("cancelToken");
CREATE INDEX "Compromisso_userId_inicio_idx" ON "Compromisso"("userId", "inicio");
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
