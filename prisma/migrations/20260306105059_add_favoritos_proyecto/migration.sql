-- CreateTable
CREATE TABLE "favoritos_proyecto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_proyecto_userId_proyectoId_key" ON "favoritos_proyecto"("userId", "proyectoId");

-- AddForeignKey
ALTER TABLE "favoritos_proyecto" ADD CONSTRAINT "favoritos_proyecto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos_proyecto" ADD CONSTRAINT "favoritos_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyectos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
