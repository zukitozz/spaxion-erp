/*
  Warnings:

  - You are about to drop the column `clienteId` on the `Cabina` table. All the data in the column will be lost.
  - You are about to drop the column `tratamientoActual` on the `Cabina` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AtencionEstado" AS ENUM ('EN_CURSO', 'FINALIZADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "CabinaEstado" ADD VALUE 'MANTENIMIENTO';

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ESTETICISTA';

-- AlterTable
ALTER TABLE "Cabina" DROP COLUMN "clienteId",
DROP COLUMN "tratamientoActual";

-- CreateTable
CREATE TABLE "AtencionCabina" (
    "id" TEXT NOT NULL,
    "cabinaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tratamientoId" TEXT NOT NULL,
    "esteticistaId" TEXT NOT NULL,
    "citaId" TEXT,
    "estado" "AtencionEstado" NOT NULL DEFAULT 'EN_CURSO',
    "horaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horaFin" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtencionCabina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CabinaEstadoLog" (
    "id" TEXT NOT NULL,
    "cabinaId" TEXT NOT NULL,
    "estadoAnterior" "CabinaEstado" NOT NULL,
    "estadoNuevo" "CabinaEstado" NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "atencionId" TEXT,
    "motivo" TEXT,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CabinaEstadoLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtencionCabina_cabinaId_estado_idx" ON "AtencionCabina"("cabinaId", "estado");

-- CreateIndex
CREATE INDEX "AtencionCabina_clienteId_idx" ON "AtencionCabina"("clienteId");

-- CreateIndex
CREATE INDEX "AtencionCabina_tratamientoId_idx" ON "AtencionCabina"("tratamientoId");

-- CreateIndex
CREATE INDEX "AtencionCabina_esteticistaId_idx" ON "AtencionCabina"("esteticistaId");

-- CreateIndex
CREATE INDEX "AtencionCabina_citaId_idx" ON "AtencionCabina"("citaId");

-- CreateIndex
CREATE INDEX "CabinaEstadoLog_cabinaId_creadoAt_idx" ON "CabinaEstadoLog"("cabinaId", "creadoAt");

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_cabinaId_fkey" FOREIGN KEY ("cabinaId") REFERENCES "Cabina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_tratamientoId_fkey" FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_esteticistaId_fkey" FOREIGN KEY ("esteticistaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionCabina" ADD CONSTRAINT "AtencionCabina_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CabinaEstadoLog" ADD CONSTRAINT "CabinaEstadoLog_cabinaId_fkey" FOREIGN KEY ("cabinaId") REFERENCES "Cabina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CabinaEstadoLog" ADD CONSTRAINT "CabinaEstadoLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CabinaEstadoLog" ADD CONSTRAINT "CabinaEstadoLog_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionCabina"("id") ON DELETE SET NULL ON UPDATE CASCADE;
