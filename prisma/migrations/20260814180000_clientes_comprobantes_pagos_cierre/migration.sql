-- AlterEnum
ALTER TYPE "FacturaTipo" ADD VALUE 'NOTA_VENTA';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MetodoPago" ADD VALUE 'TRANSFERENCIA';
ALTER TYPE "MetodoPago" ADD VALUE 'DEPOSITO';

-- AlterTable
ALTER TABLE "CierreTurno" ADD COLUMN     "totalDeposito" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalTransferencia" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Comprobante" ADD COLUMN     "pagoDeposito" DOUBLE PRECISION,
ADD COLUMN     "pagoTransferencia" DOUBLE PRECISION;

-- AlterTable: Cliente — preserve existing data (documento -> dni, telefono -> celular)
ALTER TABLE "Cliente" ADD COLUMN     "celular" TEXT,
ADD COLUMN     "distrito" TEXT,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "razonSocial" TEXT,
ADD COLUMN     "ruc" TEXT;

UPDATE "Cliente" SET "dni" = "documento";
UPDATE "Cliente" SET "celular" = "telefono";

DROP INDEX "Cliente_documento_key";

ALTER TABLE "Cliente" DROP COLUMN "documento",
DROP COLUMN "telefono";

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_dni_key" ON "Cliente"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");
