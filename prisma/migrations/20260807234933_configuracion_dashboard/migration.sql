-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nombreEmpresa" TEXT NOT NULL DEFAULT 'Spaxión Centro Estético',
    "googleCalendarActivo" BOOLEAN NOT NULL DEFAULT false,
    "googleCalendarId" TEXT,
    "facturacionEndpoint" TEXT,
    "facturacionActivo" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);
