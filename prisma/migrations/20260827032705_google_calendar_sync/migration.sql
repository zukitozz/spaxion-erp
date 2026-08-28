-- CreateEnum
CREATE TYPE "CitaOrigen" AS ENUM ('APP', 'GOOGLE');

-- DropForeignKey
ALTER TABLE "Cita" DROP CONSTRAINT "Cita_clienteId_fkey";

-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "googleEventId" TEXT,
ADD COLUMN     "origen" "CitaOrigen" NOT NULL DEFAULT 'APP',
ALTER COLUMN "clienteId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Configuracion" ADD COLUMN     "googleCuentaEmail" TEXT,
ADD COLUMN     "googleRefreshTokenEnc" TEXT,
ADD COLUMN     "googleSyncToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Cita_googleEventId_key" ON "Cita"("googleEventId");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

