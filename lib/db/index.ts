import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

export const db = prisma;

export async function getFeaturedProjects() {
  return await prisma.proyecto.findMany({
    take: 6,
    include: {
      etapas: {
        include: {
          manzanas: {
            include: {
              unidades: {
                select: {
                  precio: true,
                  moneda: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
