-- DropForeignKey
ALTER TABLE "Comprobante" DROP CONSTRAINT "Comprobante_cierreTurnoId_fkey";

-- DropForeignKey
ALTER TABLE "Comprobante" DROP CONSTRAINT "Comprobante_facturaId_fkey";

-- DropForeignKey
ALTER TABLE "Comprobante" DROP CONSTRAINT "Comprobante_usuarioId_fkey";

-- DropTable
DROP TABLE "Comprobante";

