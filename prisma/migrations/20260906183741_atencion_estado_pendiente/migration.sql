-- AlterEnum
-- Se agrega en su propia migración porque Postgres no permite usar un valor
-- de enum recién creado dentro de la misma transacción que lo agrega.
ALTER TYPE "AtencionEstado" ADD VALUE 'PENDIENTE';
