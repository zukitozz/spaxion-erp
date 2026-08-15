-- CreateTable
CREATE TABLE "Serie" (
    "id" TEXT NOT NULL,
    "codigoProposito" VARCHAR(50) NOT NULL,
    "tipoComprobante" VARCHAR(2) NOT NULL,
    "serie" VARCHAR(3) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "descripcion" VARCHAR(200),

    CONSTRAINT "Serie_pkey" PRIMARY KEY ("id")
);

