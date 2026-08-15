-- AlterTable
ALTER TABLE "AtencionCabina" ADD COLUMN     "facturaId" TEXT;

-- CreateTable
CREATE TABLE "AtencionProducto" (
    "id" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "precioUnit" DOUBLE PRECISION NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtencionProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtencionProducto_atencionId_idx" ON "AtencionProducto"("atencionId");

-- CreateIndex
CREATE INDEX "AtencionCabina_facturaId_idx" ON "AtencionCabina"("facturaId");

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionProducto" ADD CONSTRAINT "AtencionProducto_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionCabina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionProducto" ADD CONSTRAINT "AtencionProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
