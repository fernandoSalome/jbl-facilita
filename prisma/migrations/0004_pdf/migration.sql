-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfKey" TEXT,
ADD COLUMN     "pdfPages" INTEGER;
