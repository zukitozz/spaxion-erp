-- CreateTable
CREATE TABLE "TratamientoProducto" (
    "id" TEXT NOT NULL,
    "tratamientoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',

    CONSTRAINT "TratamientoProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TratamientoProducto_tratamientoId_productoId_key" ON "TratamientoProducto"("tratamientoId", "productoId");

-- AddForeignKey
ALTER TABLE "TratamientoProducto" ADD CONSTRAINT "TratamientoProducto_tratamientoId_fkey" FOREIGN KEY ("tratamientoId") REFERENCES "Tratamiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TratamientoProducto" ADD CONSTRAINT "TratamientoProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
