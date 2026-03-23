import { getAllUnidades } from "@/lib/actions/unidades";
import InventarioView from "@/components/dashboard/inventario/inventario-view";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function InventarioPage({
    searchParams
}: {
    searchParams: Promise<{ estado?: string }>
}) {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    const userRole = (session?.user as any)?.role;

    // Collect project IDs via relation-based access + legacy creadoPorId fallback.
    // Admin sees all (no proyectoIds filter). Non-admin scoped to their projects.
    let proyectoIds: string[] | undefined;
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN" && userId) {
        const relaciones = await prisma.proyectoUsuario.findMany({
            where: { userId, estadoRelacion: "ACTIVA" },
            select: { proyectoId: true },
        });
        const relationIds = relaciones.map(r => r.proyectoId);

        const legacyProjects = await prisma.proyecto.findMany({
            where: {
                creadoPorId: userId,
                deletedAt: null,
                NOT: { usuariosRelaciones: { some: { userId } } },
            },
            select: { id: true },
        });
        const legacyIds = legacyProjects.map(p => p.id);

        proyectoIds = [...relationIds, ...legacyIds].filter((id, i, arr) => arr.indexOf(id) === i);
    }

    const resolvedSearchParams = await searchParams;
    const { data: unidades } = await getAllUnidades({
        estado: resolvedSearchParams.estado,
        proyectoIds,
    });

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.developerInventario} />
            <InventarioView data={unidades || []} />
        </div>
    );
}
