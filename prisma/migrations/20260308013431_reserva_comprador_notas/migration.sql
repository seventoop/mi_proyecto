-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "compradorEmail" TEXT,
ADD COLUMN     "compradorId" TEXT,
ADD COLUMN     "compradorNombre" TEXT,
ADD COLUMN     "notas" TEXT,
ALTER COLUMN "leadId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "reservas_compradorId_idx" ON "reservas"("compradorId");

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
