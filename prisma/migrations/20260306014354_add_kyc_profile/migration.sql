-- AlterTable
ALTER TABLE "users" ADD COLUMN     "developerVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "kyc_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selfieUrl" TEXT,
    "nombrePublico" TEXT,
    "tipoDeveloper" TEXT,
    "yearsExperience" INTEGER,
    "proyectosRealizados" INTEGER,
    "descripcionProfesional" TEXT,
    "especialidad" TEXT,
    "razonSocial" TEXT,
    "nombreComercial" TEXT,
    "cuitEmpresa" TEXT,
    "direccionOficina" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "pais" TEXT DEFAULT 'Argentina',
    "telefonoComercial" TEXT,
    "sitioWeb" TEXT,
    "linkedinEmpresa" TEXT,
    "estatutoUrl" TEXT,
    "matriculaUrl" TEXT,
    "constanciaBancariaUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notasAdmin" TEXT,
    "verificadoPorId" TEXT,
    "verificadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kyc_profiles_userId_key" ON "kyc_profiles"("userId");

-- AddForeignKey
ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
