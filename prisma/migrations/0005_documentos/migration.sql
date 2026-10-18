-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'outro',
    "titulo" TEXT NOT NULL,
    "resumo" TEXT,
    "dados" JSONB,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'whatsapp',
    "enviadoPor" TEXT,
    "grupo" TEXT,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaGroup" (
    "id" TEXT NOT NULL,
    "jid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'controle',
    "projectId" TEXT,
    "contextoProjectId" TEXT,
    "contextoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocument_messageId_key" ON "ProjectDocument"("messageId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_tipo_idx" ON "ProjectDocument"("projectId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "WaGroup_jid_key" ON "WaGroup"("jid");

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

