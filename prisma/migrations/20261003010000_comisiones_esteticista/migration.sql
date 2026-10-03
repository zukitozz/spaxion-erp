-- AlterTable
ALTER TABLE "AtencionProducto" ADD COLUMN     "comision" DOUBLE PRECISION,
ADD COLUMN     "comisionEsteticistaId" TEXT;

-- AlterTable
ALTER TABLE "AtencionTratamiento" ADD COLUMN     "comision" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CierreTurno" ADD COLUMN     "totalGastos" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "cierreTurnoId" TEXT,
ADD COLUMN     "esteticistaId" TEXT;

-- CreateIndex
CREATE INDEX "Gasto_cierreTurnoId_idx" ON "Gasto"("cierreTurnoId");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_esteticistaId_fkey" FOREIGN KEY ("esteticistaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_cierreTurnoId_fkey" FOREIGN KEY ("cierreTurnoId") REFERENCES "CierreTurno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
