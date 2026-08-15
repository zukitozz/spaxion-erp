-- AlterTable
ALTER TABLE "FacturaItem" ADD COLUMN     "cantidadVenta" DOUBLE PRECISION,
ADD COLUMN     "codigo" INTEGER,
ADD COLUMN     "codigoProducto" TEXT,
ADD COLUMN     "decCantidad" DOUBLE PRECISION,
ADD COLUMN     "decIgv" DOUBLE PRECISION,
ADD COLUMN     "decSubtotal" DOUBLE PRECISION,
ADD COLUMN     "decTotal" DOUBLE PRECISION,
ADD COLUMN     "igv" DOUBLE PRECISION,
ADD COLUMN     "igvVenta" DOUBLE PRECISION,
ADD COLUMN     "precio" DOUBLE PRECISION,
ADD COLUMN     "precioVenta" DOUBLE PRECISION,
ADD COLUMN     "productoId" TEXT,
ADD COLUMN     "valor" DOUBLE PRECISION,
ADD COLUMN     "valorVenta" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "tipoComprobante" TEXT NOT NULL,
    "numeracionComprobante" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "tipoMoneda" TEXT DEFAULT 'PEN',
    "tipoOperacion" TEXT DEFAULT '0101',
    "tipoNota" TEXT,
    "tipoDocumentoAfectado" TEXT,
    "fechaDocumentoAfectado" TIMESTAMP(3),
    "numeracionDocumentoAfectado" TEXT,
    "motivoDocumentoAfectado" TEXT,
    "totalGravadas" TEXT,
    "totalIgv" TEXT,
    "totalVenta" TEXT,
    "montoLetras" TEXT,
    "cadenaParaCodigoQr" TEXT,
    "codigoHash" TEXT,
    "pdfBytes" TEXT,
    "url" TEXT,
    "errors" TEXT,
    "idAbastecimiento" INTEGER,
    "pistola" INTEGER NOT NULL DEFAULT 0,
    "codigoCombustible" TEXT NOT NULL DEFAULT '',
    "decCombustible" TEXT NOT NULL DEFAULT '',
    "volumen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaAbastecimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tiempoAbastecimiento" INTEGER NOT NULL DEFAULT 0,
    "volumenTanque" BIGINT NOT NULL DEFAULT 0,
    "comentario" TEXT,
    "pagoTarjeta" DOUBLE PRECISION,
    "pagoEfectivo" DOUBLE PRECISION,
    "pagoYape" DOUBLE PRECISION,
    "placa" TEXT,
    "billete" DOUBLE PRECISION,
    "productoPrecio" DOUBLE PRECISION,
    "ruc" TEXT,
    "enviado" BOOLEAN NOT NULL DEFAULT false,
    "estadoNotaDespacho" BOOLEAN NOT NULL DEFAULT false,
    "comprobanteNotaDespacho" TEXT,
    "fechaFacturadoNotaDespacho" TIMESTAMP(3),
    "receptorId" INTEGER,
    "usuarioId" TEXT NOT NULL,
    "cierreTurnoId" TEXT,
    "fechaHora" TIMESTAMP(3),
    "gravadas" DOUBLE PRECISION,
    "igv" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "inicioMedidor" DOUBLE PRECISION,
    "finMedidor" DOUBLE PRECISION,
    "xmlEnvio" TEXT,
    "impresion" INTEGER NOT NULL DEFAULT 1,
    "islaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Comprobante_facturaId_key" ON "Comprobante"("facturaId");

-- AddForeignKey
ALTER TABLE "FacturaItem" ADD CONSTRAINT "FacturaItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comprobante" ADD CONSTRAINT "Comprobante_cierreTurnoId_fkey" FOREIGN KEY ("cierreTurnoId") REFERENCES "CierreTurno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
