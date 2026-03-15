-- AlterTable
ALTER TABLE "kyc_profiles" ADD COLUMN     "dniDorso" TEXT,
ADD COLUMN     "dniFrente" TEXT,
ADD COLUMN     "ingresosEstimados" TEXT,
ADD COLUMN     "pasaporteUrl" TEXT,
ADD COLUMN     "patrimonioEstimado" TEXT,
ADD COLUMN     "perfilRiesgo" TEXT,
ADD COLUMN     "politicasAceptadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "politicasAceptadasAt" TIMESTAMP(3),
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'DESARROLLADOR';
