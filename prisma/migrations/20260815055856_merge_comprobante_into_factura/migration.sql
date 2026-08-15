-- AlterTable
ALTER TABLE "Factura" ADD COLUMN     "billete" DOUBLE PRECISION,
ADD COLUMN     "cadenaParaCodigoQr" TEXT,
ADD COLUMN     "cierreTurnoId" TEXT,
ADD COLUMN     "codigoHash" TEXT,
ADD COLUMN     "comentario" TEXT,
ADD COLUMN     "comprobanteNotaDespacho" TEXT,
ADD COLUMN     "enviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "errors" TEXT,
ADD COLUMN     "estadoNotaDespacho" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fechaDocumentoAfectado" TIMESTAMP(3),
ADD COLUMN     "fechaEmision" TIMESTAMP(3),
ADD COLUMN     "fechaFacturadoNotaDespacho" TIMESTAMP(3),
ADD COLUMN     "fechaHora" TIMESTAMP(3),
ADD COLUMN     "gravadas" DOUBLE PRECISION,
ADD COLUMN     "igv" DOUBLE PRECISION,
ADD COLUMN     "impresion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "montoLetras" TEXT,
ADD COLUMN     "motivoDocumentoAfectado" TEXT,
ADD COLUMN     "numeracionComprobante" TEXT,
ADD COLUMN     "numeracionDocumentoAfectado" TEXT,
ADD COLUMN     "pagoDeposito" DOUBLE PRECISION,
ADD COLUMN     "pagoEfectivo" DOUBLE PRECISION,
ADD COLUMN     "pagoTarjeta" DOUBLE PRECISION,
ADD COLUMN     "pagoTransferencia" DOUBLE PRECISION,
ADD COLUMN     "pagoYape" DOUBLE PRECISION,
ADD COLUMN     "pdfBytes" TEXT,
ADD COLUMN     "pistola" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "productoPrecio" DOUBLE PRECISION,
ADD COLUMN     "receptorId" INTEGER,
ADD COLUMN     "ruc" TEXT,
ADD COLUMN     "tipoComprobante" TEXT,
ADD COLUMN     "tipoDocumentoAfectado" TEXT,
ADD COLUMN     "tipoMoneda" TEXT DEFAULT 'PEN',
ADD COLUMN     "tipoNota" TEXT,
ADD COLUMN     "tipoOperacion" TEXT DEFAULT '0101',
ADD COLUMN     "totalGravadas" TEXT,
ADD COLUMN     "totalIgv" TEXT,
ADD COLUMN     "totalVenta" TEXT,
ADD COLUMN     "url" TEXT,
ADD COLUMN     "usuarioId" TEXT,
ADD COLUMN     "xmlEnvio" TEXT;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_cierreTurnoId_fkey" FOREIGN KEY ("cierreTurnoId") REFERENCES "CierreTurno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

