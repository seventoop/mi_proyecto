/**
 * Auditoria de solo lectura del circuito de proyectos inmobiliarios.
 *
 * Uso:
 *   npm run audit:elpampa-projects
 *
 * No crea usuarios, proyectos ni relaciones y no muestra credenciales.
 */

import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });
loadEnv();

const prisma = new PrismaClient();

function describeDatabase(url: string | undefined): string {
  if (!url) return "(no DATABASE_URL)";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "?"}${parsed.pathname}`;
  } catch {
    return "(DATABASE_URL invalida)";
  }
}

async function main() {
  const now = new Date();
  const publicWhere = {
    deletedAt: null,
    visibilityStatus: "PUBLICADO" as const,
    estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO", "DESACTIVADO"] },
    OR: [
      { isDemo: false },
      { isDemo: true, demoExpiresAt: { gt: now } },
    ],
  };

  const [
    organizations,
    users,
    projects,
    publicProjects,
    stages,
    blocks,
    units,
    mapImages,
    projectImages,
    infrastructure,
    tours,
    leads,
    reservations,
    projectSamples,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.proyecto.count(),
    prisma.proyecto.count({ where: publicWhere }),
    prisma.etapa.count(),
    prisma.manzana.count(),
    prisma.unidad.count(),
    prisma.imagenMapa.count(),
    prisma.proyectoImagen.count(),
    prisma.infraestructura.count(),
    prisma.tour360.count(),
    prisma.lead.count(),
    prisma.reserva.count(),
    prisma.proyecto.findMany({
      select: {
        id: true,
        slug: true,
        nombre: true,
        estado: true,
        visibilityStatus: true,
        isDemo: true,
        demoExpiresAt: true,
        deletedAt: true,
        _count: {
          select: { etapas: true, imagenes: true, tours: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ]);

  console.log("=== SEVENTOOP PROJECT DATA AUDIT (READ-ONLY) ===");
  console.log(`DATABASE: ${describeDatabase(process.env.DATABASE_URL)}`);
  console.log(`Evaluacion de visibilidad: ${now.toISOString()}`);
  console.log("");
  console.log("tabla/entidad       cantidad");
  console.log("-------------------  --------");
  for (const [label, value] of Object.entries({
    organizations,
    users,
    projects,
    publicProjects,
    stages,
    blocks,
    units,
    mapImages,
    projectImages,
    infrastructure,
    tours,
    leads,
    reservations,
  })) {
    console.log(`${label.padEnd(19)}  ${value}`);
  }

  console.log("\n--- PROJECT SAMPLES ---");
  if (projectSamples.length === 0) {
    console.log("(sin proyectos)");
  } else {
    for (const project of projectSamples) {
      console.log(JSON.stringify(project));
    }
  }

  console.log("\n=== AUDIT COMPLETE: no se modifico ninguna base ===");
}

main()
  .catch((error) => {
    console.error("AUDIT FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
