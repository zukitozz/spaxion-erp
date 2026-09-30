-- CreateEnum
CREATE TYPE "PaqueteEstado" AS ENUM ('ABIERTO', 'CERRADO');

-- AlterEnum
ALTER TYPE "MetodoPago" ADD VALUE 'MIXTO';

-- AlterTable
ALTER TABLE "Factura" ADD COLUMN     "comprobanteFinalId" TEXT,
ADD COLUMN     "cuentaParaCierre" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paqueteId" TEXT;

-- CreateTable
CREATE TABLE "Paquete" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tratamientoId" TEXT,
    "nombre" TEXT NOT NULL,
    "sesionesTotal" INTEGER NOT NULL,
    "precioTotal" DOUBLE PRECISION NOT NULL,
    "estado" "PaqueteEstado" NOT NULL DEFAULT 'ABIERTO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoAt" TIMESTAMP(3),

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paquete_clienteId_idx" ON "Paquete"("clienteId");

-- CreateIndex
CREATE INDEX "Factura_paqueteId_idx" ON "Factura"("paqueteId");

-- RenameForeignKey
ALTER TABLE "Atencion" RENAME CONSTRAINT "AtencionCabina_citaId_fkey" TO "Atencion_citaId_fkey";

-- RenameForeignKey
ALTER TABLE "Atencion" RENAME CONSTRAINT "AtencionCabina_clienteId_fkey" TO "Atencion_clienteId_fkey";

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_comprobanteFinalId_fkey" FOREIGN KEY ("comprobanteFinalId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_tratamientoId_fkey" FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paquete" ADD CONSTRAINT "Paquete_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
