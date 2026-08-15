-- CreateEnum
CREATE TYPE "FotoTipo" AS ENUM ('ANTES', 'DESPUES', 'EVOLUCION');

-- CreateTable
CREATE TABLE "AtencionFoto" (
    "id" TEXT NOT NULL,
    "atencionId" TEXT NOT NULL,
    "tipo" "FotoTipo" NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtencionFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtencionFoto_atencionId_idx" ON "AtencionFoto"("atencionId");

-- AddForeignKey
ALTER TABLE "AtencionFoto" ADD CONSTRAINT "AtencionFoto_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionCabina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
