-- AlterTable
ALTER TABLE "proyectos" ADD COLUMN     "tour360Url" TEXT;

-- AlterTable
ALTER TABLE "tours_360" ADD COLUMN     "anchors" JSONB;

-- AlterTable
ALTER TABLE "unidades" ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3);
