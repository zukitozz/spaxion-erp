-- AlterTable: precio acordado al asignar el tratamiento a la visita + snapshot del catálogo
ALTER TABLE "AtencionTratamiento" ADD COLUMN     "precio" DOUBLE PRECISION,
ADD COLUMN     "precioCatalogo" DOUBLE PRECISION;

-- AlterTable: snapshot del catálogo al agregar el producto a la visita
ALTER TABLE "AtencionProducto" ADD COLUMN     "precioCatalogo" DOUBLE PRECISION;

-- AlterTable: snapshot del catálogo y del precio acordado (antes de repartir el descuento)
-- al momento de facturar, para poder evidenciar cambios de precio base en los reportes
ALTER TABLE "FacturaItem" ADD COLUMN     "precioCatalogo" DOUBLE PRECISION,
ADD COLUMN     "precioUnitOriginal" DOUBLE PRECISION;
