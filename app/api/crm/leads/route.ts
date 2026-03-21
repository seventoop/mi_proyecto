import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";
import { runWorkflow } from "@/lib/workflow-engine";
import { requireAuth, handleApiGuardError, orgFilter } from "@/lib/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { leadSchema } from "@/lib/validations";
import { executeLeadReception } from "@/lib/crm-pipeline";

// Schema validation for creating a lead
const createLeadSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email().optional().or(z.literal("")),
    telefono: z.string().optional(),
    origen: z.enum(["WEB", "WHATSAPP", "REFERIDO"]).default("WEB"),
    mensaje: z.string().optional(),
    proyectoId: z.string().optional(),
    unidadInteres: z.string().optional(), // ID of unit
});

export async function POST(request: Request) {
    try {
        // Require authentication for CRM lead creation
        const user = await requireAuth();

        // Rate limit: 10 lead creations per IP per 10 minutes (integration endpoint)
        const ip = getClientIp(request);
        const { allowed } = await checkRateLimit(ip, { limit: 10, windowMs: 10 * 60 * 1000, keyPrefix: "crm_lead_post:" });
        if (!allowed) {
            return NextResponse.json({ message: "Demasiadas solicitudes" }, { status: 429 });
        }

        const body = await request.json();
        const validation = leadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { errors: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { nombre, email, telefono, origen, mensaje, proyectoId, unidadInteres } = validation.data;

        // A2: Inherit orgId — proyecto is the most reliable source, fallback to user's org
        let orgId: string | null = (user.orgId as string | null) ?? null;
        if (proyectoId) {
            const proyecto = await db.proyecto.findUnique({
                where: { id: proyectoId },
                select: { orgId: true },
            });
            
            // Validate project tenant boundary
            if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
                if (!proyecto || !user.orgId || proyecto.orgId !== user.orgId) {
                    return NextResponse.json({ message: "Proyecto no encontrado" }, { status: 404 });
                }
            }
            
            if (proyecto?.orgId) orgId = proyecto.orgId;
        }

        const result = await executeLeadReception({
            nombre,
            email: email || null,
            telefono: telefono || null,
            origen,
            canalOrigen: "API_CRM",
            proyectoId: proyectoId || null,
            unidadInteres: unidadInteres ? JSON.stringify([unidadInteres]) : "[]",
            orgId,
            mensaje,
            sourceType: "API_CRM"
        });

        if (!result.success) {
            throw new Error(result.error || "Error en el pipeline de leads");
        }

        const lead = await db.lead.findUnique({ where: { id: result.leadId } });

        return NextResponse.json(lead, { status: 201 });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado");
        const search = searchParams.get("search");
        const proyectoId = searchParams.get("proyectoId");

        // Canonical multi-tenant scoping
        const where: Prisma.LeadWhereInput = {
            ...orgFilter(user) as any,
        };

        if (estado) {
            where.estado = estado as any;
        }

        if (proyectoId) {
            where.proyectoId = proyectoId;
        }

        if (search) {
            where.OR = [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } },
            ];
        }

        const leads = await db.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                proyecto: { select: { nombre: true } },
                reservas: { select: { id: true, estado: true } },
                oportunidades: {
                    select: { etapa: true, valorEstimado: true }
                },
                asignadoA: { select: { nombre: true, email: true } }
            },
            take: 50, // Pagination limit
        });

        return NextResponse.json(leads);
    } catch (error) {
        return handleApiGuardError(error);
    }
}
