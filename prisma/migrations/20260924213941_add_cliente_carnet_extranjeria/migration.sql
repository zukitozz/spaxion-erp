-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "carnetExtranjeria" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_carnetExtranjeria_key" ON "Cliente"("carnetExtranjeria");
