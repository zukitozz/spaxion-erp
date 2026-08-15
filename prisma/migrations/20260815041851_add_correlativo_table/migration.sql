-- CreateTable
CREATE TABLE "Correlativo" (
    "id" TEXT NOT NULL,
    "tipoDocumento" VARCHAR(2) NOT NULL,
    "serie" VARCHAR(3) NOT NULL,
    "prefijo" CHAR(2) NOT NULL,
    "numeracion" INTEGER NOT NULL DEFAULT 0,
    "estado" CHAR(1) NOT NULL DEFAULT 'A',
    "ruc" VARCHAR(11) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Correlativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Correlativo_ruc_tipoDocumento_serie_prefijo_key" ON "Correlativo"("ruc", "tipoDocumento", "serie", "prefijo");

