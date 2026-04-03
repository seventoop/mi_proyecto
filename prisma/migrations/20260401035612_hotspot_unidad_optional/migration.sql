-- DropForeignKey
ALTER TABLE "tour_hotspots" DROP CONSTRAINT "tour_hotspots_unidadId_fkey";

-- AlterTable
ALTER TABLE "tour_hotspots" ALTER COLUMN "unidadId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "tour_hotspots" ADD CONSTRAINT "tour_hotspots_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
