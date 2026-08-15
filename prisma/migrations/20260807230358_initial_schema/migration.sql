-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERVISOR', 'ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "CitaEstado" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CabinaEstado" AS ENUM ('DISPONIBLE', 'ATENCION', 'LIMPIEZA');

-- CreateEnum
CREATE TYPE "FacturaTipo" AS ENUM ('BOLETA', 'FACTURA');

-- CreateEnum
CREATE TYPE "DescuentoTipo" AS ENUM ('PORCENTAJE', 'FIJO');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'YAPE', 'PLIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "peso" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tratamiento" TEXT NOT NULL,
    "estado" "CitaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "registrado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cabina" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" "CabinaEstado" NOT NULL DEFAULT 'DISPONIBLE',
    "tratamientoActual" TEXT,
    "clienteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cabina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "precioCosto" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "alertaStock" INTEGER NOT NULL DEFAULT 5,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tratamiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "duracionMin" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tratamiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipo" "FacturaTipo" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "estado" TEXT NOT NULL,
    "comprobante" TEXT,
    "descuentoAplicado" DOUBLE PRECISION DEFAULT 0,
    "descuentoId" TEXT,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Descuento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "DescuentoTipo" NOT NULL DEFAULT 'PORCENTAJE',
    "valor" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Descuento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaItem" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FacturaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CierreTurno" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "totalVentas" DOUBLE PRECISION NOT NULL,
    "totalEfectivo" DOUBLE PRECISION NOT NULL,
    "totalTarjeta" DOUBLE PRECISION NOT NULL,
    "totalYape" DOUBLE PRECISION NOT NULL,
    "creadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CierreTurno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_documento_key" ON "Cliente"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Descuento_codigo_key" ON "Descuento"("codigo");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_descuentoId_fkey" FOREIGN KEY ("descuentoId") REFERENCES "Descuento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaItem" ADD CONSTRAINT "FacturaItem_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreTurno" ADD CONSTRAINT "CierreTurno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
