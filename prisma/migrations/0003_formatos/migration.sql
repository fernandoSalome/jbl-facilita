-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "formato" TEXT NOT NULL DEFAULT 'loteamento_aberto',
ADD COLUMN     "formatoVersionId" TEXT;

-- CreateTable
CREATE TABLE "FormatoVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormatoVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormatoVersion_templateId_formato_idx" ON "FormatoVersion"("templateId", "formato");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_formatoVersionId_fkey" FOREIGN KEY ("formatoVersionId") REFERENCES "FormatoVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormatoVersion" ADD CONSTRAINT "FormatoVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
