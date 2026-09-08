-- Reestructuración: separar la "visita" (Atencion) del detalle de cada
-- tratamiento (AtencionTratamiento), y quitar la obligatoriedad de cabina.
-- Escrita a mano (en vez de confiar en el diff automático de Prisma) para
-- preservar todos los datos existentes de AtencionCabina.

-- 1) Renombrar AtencionCabina -> Atencion, conservando filas y PK.
ALTER TABLE "AtencionCabina" RENAME TO "Atencion";
ALTER TABLE "Atencion" RENAME CONSTRAINT "AtencionCabina_pkey" TO "Atencion_pkey";

-- 2) cabinaId deja de ser obligatorio.
ALTER TABLE "Atencion" DROP CONSTRAINT "AtencionCabina_cabinaId_fkey";
ALTER TABLE "Atencion" ALTER COLUMN "cabinaId" DROP NOT NULL;
ALTER TABLE "Atencion" ADD CONSTRAINT "Atencion_cabinaId_fkey" FOREIGN KEY ("cabinaId") REFERENCES "Cabina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3) Crear la tabla de detalle de tratamientos por atención.
CREATE TABLE "AtencionTratamiento" (
    "id" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "tratamientoId" TEXT NOT NULL,
    "esteticistaId" TEXT NOT NULL,
    "estado" "AtencionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "horaInicio" TIMESTAMP(3),
    "horaFin" TIMESTAMP(3),
    "notas" TEXT,
    "diasProximoTratamiento" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "facturaId" TEXT,

    CONSTRAINT "AtencionTratamiento_pkey" PRIMARY KEY ("id")
);

-- 4) Backfill: una fila de AtencionTratamiento por cada Atencion existente,
--    copiando el único tratamiento/esteticista/estado/horas que tenía.
INSERT INTO "AtencionTratamiento" (
    "id", "atencionId", "tratamientoId", "esteticistaId", "estado",
    "horaInicio", "horaFin", "diasProximoTratamiento", "facturaId",
    "orden", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(), "id", "tratamientoId", "esteticistaId", "estado",
    "horaInicio", "horaFin", "diasProximoTratamiento", "facturaId",
    0, "createdAt", "updatedAt"
FROM "Atencion";

-- 5) Los productos de la visita ahora se facturan por línea propia; se parte
--    del facturaId que ya tenía la visita completa (si ya estaba facturada).
ALTER TABLE "AtencionProducto" ADD COLUMN "facturaId" TEXT;
UPDATE "AtencionProducto" p SET "facturaId" = a."facturaId" FROM "Atencion" a WHERE p."atencionId" = a."id";

-- 6) Quitar de Atencion las columnas que ahora viven en AtencionTratamiento.
ALTER TABLE "Atencion" DROP CONSTRAINT "AtencionCabina_tratamientoId_fkey";
ALTER TABLE "Atencion" DROP CONSTRAINT "AtencionCabina_esteticistaId_fkey";
ALTER TABLE "Atencion" DROP CONSTRAINT "AtencionCabina_facturaId_fkey";
ALTER TABLE "Atencion" DROP COLUMN "tratamientoId";
ALTER TABLE "Atencion" DROP COLUMN "esteticistaId";
ALTER TABLE "Atencion" DROP COLUMN "estado";
ALTER TABLE "Atencion" DROP COLUMN "diasProximoTratamiento";
ALTER TABLE "Atencion" DROP COLUMN "facturaId";

-- 7) Índices viejos atados a columnas eliminadas / al índice compuesto.
DROP INDEX IF EXISTS "AtencionCabina_cabinaId_estado_idx";
DROP INDEX IF EXISTS "AtencionCabina_tratamientoId_idx";
DROP INDEX IF EXISTS "AtencionCabina_esteticistaId_idx";
DROP INDEX IF EXISTS "AtencionCabina_facturaId_idx";
ALTER INDEX "AtencionCabina_clienteId_idx" RENAME TO "Atencion_clienteId_idx";
ALTER INDEX "AtencionCabina_citaId_idx" RENAME TO "Atencion_citaId_idx";

CREATE INDEX "Atencion_cabinaId_idx" ON "Atencion"("cabinaId");

-- 8) Índices y FKs de AtencionTratamiento y del facturaId de AtencionProducto.
CREATE INDEX "AtencionTratamiento_atencionId_idx" ON "AtencionTratamiento"("atencionId");
CREATE INDEX "AtencionTratamiento_tratamientoId_idx" ON "AtencionTratamiento"("tratamientoId");
CREATE INDEX "AtencionTratamiento_esteticistaId_idx" ON "AtencionTratamiento"("esteticistaId");
CREATE INDEX "AtencionTratamiento_facturaId_idx" ON "AtencionTratamiento"("facturaId");
CREATE INDEX "AtencionProducto_facturaId_idx" ON "AtencionProducto"("facturaId");

ALTER TABLE "AtencionTratamiento" ADD CONSTRAINT "AtencionTratamiento_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "Atencion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AtencionTratamiento" ADD CONSTRAINT "AtencionTratamiento_tratamientoId_fkey" FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AtencionTratamiento" ADD CONSTRAINT "AtencionTratamiento_esteticistaId_fkey" FOREIGN KEY ("esteticistaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AtencionTratamiento" ADD CONSTRAINT "AtencionTratamiento_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AtencionProducto" ADD CONSTRAINT "AtencionProducto_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9) Nuevo parámetro de configuración: usar o no cabinas físicas (default true
--    para no cambiar el comportamiento actual hasta que se desactive desde Ajustes).
ALTER TABLE "Configuracion" ADD COLUMN "usaCabinas" BOOLEAN NOT NULL DEFAULT true;
