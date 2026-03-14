import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireAuth, requireAnyRole, handleApiGuardError } from "@/lib/guards";
import { proyectoCreateSchema } from "@/lib/validations";

// GET /api/proyectos — listar con stats agregadas
// ... (omitted)

export async function POST(request: Request) {
    try {
        const user = await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR"]);
        const body = await request.json();
        
        const { proyectoCreateSchema } = await import("@/lib/validations");
        const parsed = proyectoCreateSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || "Datos inválidos" },
                { status: 400 }
            );
        }
        const data = parsed.data;

        const proyecto = await prisma.proyecto.create({
            data: {
                ...data,
                galeria: JSON.stringify((data as any).galeria || []),
                documentos: JSON.stringify((data as any).documentos || []),
                creadoPorId: user.id,
                orgId: user.orgId || null,
            },
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: "PROJECT_CREATE",
                entity: "Proyecto",
                entityId: proyecto.id,
                details: JSON.stringify({ nombre: proyecto.nombre, orgId: proyecto.orgId })
            }
        });

        return NextResponse.json(proyecto, { status: 201 });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
