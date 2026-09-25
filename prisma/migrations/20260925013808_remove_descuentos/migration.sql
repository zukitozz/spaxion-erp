-- Se elimina por completo la funcionalidad de descuentos: no había datos existentes
-- (0 registros en Descuento, 0 facturas con descuentoAplicado/descuentoId) al momento de
-- este cambio. Solo se permite ajustar el precio base (ver AtencionTratamiento.precio,
-- AtencionProducto.precioUnit, FacturaItem.precioUnit/precioCatalogo).

-- DropForeignKey
ALTER TABLE "Factura" DROP CONSTRAINT IF EXISTS "Factura_descuentoId_fkey";

-- AlterTable
ALTER TABLE "Factura" DROP COLUMN IF EXISTS "descuentoAplicado",
DROP COLUMN IF EXISTS "descuentoId";

-- DropTable
DROP TABLE IF EXISTS "Descuento";

-- DropEnum
DROP TYPE IF EXISTS "DescuentoTipo";

-- precioUnitOriginal ya no es necesario: sin redistribución de descuento, precioUnit nunca
-- se aparta del precio acordado, así que la comparación se hace directo contra precioCatalogo.
ALTER TABLE "FacturaItem" DROP COLUMN IF EXISTS "precioUnitOriginal";
