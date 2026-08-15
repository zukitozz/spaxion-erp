-- CreateEnum
CREATE TYPE "MovimientoTipo" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE');

-- AlterTable
ALTER TABLE "AtencionCabina" ADD COLUMN     "diasProximoTratamiento" INTEGER;

-- AlterTable
ALTER TABLE "AtencionFoto" ALTER COLUMN "tipo" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "recordatorioPospuestoHasta" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "codigoBarras" TEXT,
ADD COLUMN     "imagenUrl" TEXT;

-- AlterTable
ALTER TABLE "Tratamiento" ADD COLUMN     "diasProximoTratamiento" INTEGER;

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" "MovimientoTipo" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockNuevo" INTEGER NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoInventario_productoId_creadoAt_idx" ON "MovimientoInventario"("productoId", "creadoAt");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_codigoBarras_key" ON "Producto"("codigoBarras");

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

