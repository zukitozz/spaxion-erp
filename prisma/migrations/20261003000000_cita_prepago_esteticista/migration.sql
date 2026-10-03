-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "esteticistaId" TEXT,
ADD COLUMN     "montoPrepagado" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Cita_esteticistaId_idx" ON "Cita"("esteticistaId");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_esteticistaId_fkey" FOREIGN KEY ("esteticistaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
