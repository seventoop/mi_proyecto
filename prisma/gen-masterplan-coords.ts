import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const LOT_W  = 20;
const LOT_H  = 32;
const GAP    = 2;
const STREET = 16;
const COLS   = 5;

function rect(x: number, y: number, w: number, h: number): string {
  return `M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
}

async function main() {
  const proyectos = await prisma.proyecto.findMany({
    where: { slug: { notIn: ["barrio-los-alamos"] }, deletedAt: null },
    select: { id: true, slug: true, nombre: true }
  });

  for (const proyecto of proyectos) {
    const etapas = await prisma.etapa.findMany({
      where: { proyectoId: proyecto.id },
      orderBy: { orden: "asc" },
      include: {
        manzanas: {
          orderBy: { nombre: "asc" },
          include: { unidades: { orderBy: { numero: "asc" } } }
        }
      }
    });

    let globalId = 1;
    let etapaOffsetY = 0;
    const updates: { id: string; coords: string }[] = [];

    for (const etapa of etapas) {
      let manzanaOffsetX = 0;
      let maxRowsInEtapa = 0;

      for (const manzana of etapa.manzanas) {
        const rows = Math.ceil(manzana.unidades.length / COLS);
        if (rows > maxRowsInEtapa) maxRowsInEtapa = rows;

        for (let i = 0; i < manzana.unidades.length; i++) {
          const unit = manzana.unidades[i];
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = manzanaOffsetX + col * (LOT_W + GAP);
          const y = etapaOffsetY + row * (LOT_H + GAP);
          const cx = x + LOT_W / 2;
          const cy = y + LOT_H / 2;
          updates.push({
            id: unit.id,
            coords: JSON.stringify({ path: rect(x, y, LOT_W, LOT_H), center: { x: cx, y: cy }, internalId: globalId++, lotLabel: null })
          });
        }
        // next manzana: shift X by manzana width + street
        manzanaOffsetX += COLS * (LOT_W + GAP) - GAP + STREET;
      }
      // next etapa: shift Y by max rows in etapa + street
      etapaOffsetY += maxRowsInEtapa * (LOT_H + GAP) - GAP + STREET;
    }

    // Batch update
    for (const u of updates) {
      await prisma.unidad.update({
        where: { id: u.id },
        data: { coordenadasMasterplan: u.coords } as any
      });
    }
    console.log(`✅ ${proyecto.nombre}: ${updates.length} unidades actualizadas`);
  }
  console.log("\n✅ Listo — masterplan coords generadas para todos los proyectos!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
