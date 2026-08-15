/*
  Warnings:

  - You are about to alter the column `cantidad` on the `AtencionProducto` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "AtencionProducto" ALTER COLUMN "cantidad" SET DEFAULT 1,
ALTER COLUMN "cantidad" SET DATA TYPE INTEGER;
