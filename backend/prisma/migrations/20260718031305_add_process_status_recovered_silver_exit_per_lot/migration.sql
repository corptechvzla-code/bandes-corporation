-- CreateEnum
CREATE TYPE "BarStatus" AS ENUM ('IN_STOCK', 'PROCESANDO', 'COMPLETADO', 'EXITED');

-- CreateEnum
CREATE TYPE "ProcessStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "rif" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Process" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "ProcessStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Process_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "operator" TEXT,
    "castingTemp" DOUBLE PRECISION,
    "moldCode" TEXT,
    "recovered" DECIMAL(15,4),
    "recoveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bar" (
    "id" TEXT NOT NULL,
    "barNumber" TEXT NOT NULL,
    "grossWeight" DECIMAL(15,4) NOT NULL,
    "purity" DECIMAL(7,4) NOT NULL,
    "fineWeight" DECIMAL(15,4) NOT NULL,
    "leyAg" DECIMAL(7,4),
    "fineWeightAg" DECIMAL(15,4),
    "status" "BarStatus" NOT NULL DEFAULT 'IN_STOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "exitDetailId" TEXT,
    "lotId" TEXT,

    CONSTRAINT "Bar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialExit" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "totalWeight" DECIMAL(15,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitDetail" (
    "id" TEXT NOT NULL,
    "weightAported" DECIMAL(15,4) NOT NULL,
    "exitId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,

    CONSTRAINT "ExitDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_rif_key" ON "Client"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "Process_name_clientId_key" ON "Process"("name", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Bar_barNumber_key" ON "Bar"("barNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExitDetail_exitId_lotId_key" ON "ExitDetail"("exitId", "lotId");

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bar" ADD CONSTRAINT "Bar_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bar" ADD CONSTRAINT "Bar_exitDetailId_fkey" FOREIGN KEY ("exitDetailId") REFERENCES "ExitDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bar" ADD CONSTRAINT "Bar_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitDetail" ADD CONSTRAINT "ExitDetail_exitId_fkey" FOREIGN KEY ("exitId") REFERENCES "MaterialExit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitDetail" ADD CONSTRAINT "ExitDetail_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
