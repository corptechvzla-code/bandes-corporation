-- CreateEnum
CREATE TYPE "ClientRole" AS ENUM ('PROVEEDOR', 'CLIENTE', 'AMBOS');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN "role" "ClientRole" NOT NULL DEFAULT 'AMBOS';
