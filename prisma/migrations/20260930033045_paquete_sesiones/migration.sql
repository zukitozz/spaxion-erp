-- CreateTable
CREATE TABLE "PaqueteSesion" (
    "id" TEXT NOT NULL,
    "paqueteId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "usuarioId" TEXT,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaqueteSesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaqueteSesion_paqueteId_idx" ON "PaqueteSesion"("paqueteId");

-- AddForeignKey
ALTER TABLE "PaqueteSesion" ADD CONSTRAINT "PaqueteSesion_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaqueteSesion" ADD CONSTRAINT "PaqueteSesion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
