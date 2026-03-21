/**
 * Phase 1 Backfill — Project User Relations
 *
 * For each existing Proyecto with creadoPorId:
 *   - Create ProyectoUsuario(OWNER, ACTIVA, all permisos=true)
 *
 * For estadoValidacion:
 *   - documentacionEstado = "APROBADO" → APROBADO, operational flags = true
 *   - else → BORRADOR, flags = false
 *
 * Idempotent: upsert on (proyectoId, userId).
 */
import { PrismaClient, EstadoValidacionProyecto } from "@prisma/client";

const prisma = new PrismaClient();

type OperationalFlags = {
    puedePublicarse: boolean;
    puedeReservarse: boolean;
    puedeCaptarLeads: boolean;
};

function flagsForEstado(estado: EstadoValidacionProyecto): OperationalFlags {
    return {
        puedePublicarse: estado === "APROBADO",
        puedeReservarse: estado === "APROBADO",
        puedeCaptarLeads: estado === "APROBADO",
    };
}

async function main() {
    console.log("🔄 Backfill: ProyectoUsuario + estadoValidacion...\n");

    const proyectos = await prisma.proyecto.findMany({
        select: {
            id: true,
            nombre: true,
            creadoPorId: true,
            orgId: true,
            documentacionEstado: true,
        },
    });

    console.log(`   Proyectos encontrados: ${proyectos.length}`);

    let relCreated = 0;
    let relSkipped = 0;
    let estadoUpdated = 0;

    for (const p of proyectos) {
        // ─── estadoValidacion + flags ───────────────────────────────
        const nuevoEstado: EstadoValidacionProyecto =
            p.documentacionEstado === "APROBADO" ? "APROBADO" : "BORRADOR";
        const flags = flagsForEstado(nuevoEstado);

        await prisma.proyecto.update({
            where: { id: p.id },
            data: {
                estadoValidacion: nuevoEstado,
                ...flags,
                // Clear any potential stale override
                flagsOverridePorId: null,
                flagsOverrideAt: null,
            },
        });
        estadoUpdated++;

        // ─── ProyectoUsuario (OWNER) ────────────────────────────────
        if (!p.creadoPorId || !p.orgId) {
            console.log(`   ⚠️  ${p.nombre}: sin creadoPorId o orgId — skip relación`);
            relSkipped++;
            continue;
        }

        await prisma.proyectoUsuario.upsert({
            where: { proyectoId_userId: { proyectoId: p.id, userId: p.creadoPorId } },
            update: {
                tipoRelacion: "OWNER",
                estadoRelacion: "ACTIVA",
                permisoEditarProyecto: true,
                permisoSubirDocumentacion: true,
                permisoVerLeadsGlobales: true,
                permisoVerMetricasGlobales: true,
            },
            create: {
                proyectoId: p.id,
                userId: p.creadoPorId,
                orgId: p.orgId,
                tipoRelacion: "OWNER",
                estadoRelacion: "ACTIVA",
                permisoEditarProyecto: true,
                permisoSubirDocumentacion: true,
                permisoVerLeadsGlobales: true,
                permisoVerMetricasGlobales: true,
            },
        });
        relCreated++;
    }

    console.log(`\n✅ estadoValidacion actualizado: ${estadoUpdated} proyectos`);
    console.log(`✅ Relaciones OWNER creadas/actualizadas: ${relCreated}`);
    if (relSkipped > 0) console.log(`⚠️  Proyectos sin relación (sin creadoPorId/orgId): ${relSkipped}`);

    // ─── Verification ──────────────────────────────────────────────
    const [relCount, aprobados, borradores] = await Promise.all([
        prisma.proyectoUsuario.count(),
        prisma.proyecto.count({ where: { estadoValidacion: "APROBADO" } }),
        prisma.proyecto.count({ where: { estadoValidacion: "BORRADOR" } }),
    ]);

    const sample = await prisma.proyectoUsuario.findMany({
        select: {
            tipoRelacion: true,
            estadoRelacion: true,
            proyecto: { select: { nombre: true, estadoValidacion: true, puedePublicarse: true, puedeReservarse: true } },
            user: { select: { nombre: true, rol: true } },
        },
    });

    console.log("\n📊 Verificación:");
    console.log(`   ProyectoUsuario total: ${relCount}`);
    console.log(`   Proyectos APROBADO:    ${aprobados} (flags=true)`);
    console.log(`   Proyectos BORRADOR:    ${borradores} (flags=false)`);
    console.log("\n📋 Relaciones creadas:");
    sample.forEach(r =>
        console.log(
            `   [${r.tipoRelacion}/${r.estadoRelacion}] ${r.user.nombre} → ${r.proyecto.nombre}` +
            ` | validacion: ${r.proyecto.estadoValidacion} | publicar: ${r.proyecto.puedePublicarse}`
        )
    );

    console.log("\n🎉 Backfill completado correctamente.");
}

main()
    .catch((e) => {
        console.error("❌ Backfill error:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
