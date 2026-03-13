import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";
import { runWorkflow } from "@/lib/workflow-engine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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
        // Rate limit: 10 lead creations per IP per 10 minutes (integration endpoint)
        const ip = getClientIp(request);
        const { allowed } = checkRateLimit(ip, { limit: 10, windowMs: 10 * 60 * 1000, keyPrefix: "crm_lead_post:" });
        if (!allowed) {
            return NextResponse.json({ message: "Demasiadas solicitudes" }, { status: 429 });
        }

        const body = await request.json();
        const validation = createLeadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { errors: validation.error.flatten() },
                { status: 400 }
            );
        }

        const { nombre, email, telefono, origen, mensaje, proyectoId, unidadInteres } = validation.data;

        // A2: Inherit orgId from project when proyectoId is provided
        let orgId: string | null = null;
        if (proyectoId) {
            const proyecto = await db.proyecto.findUnique({
                where: { id: proyectoId },
                select: { orgId: true },
            });
            orgId = proyecto?.orgId ?? null;
        }

        // Create Lead
        const lead = await db.lead.create({
            data: {
                nombre,
                email: email || null,
                telefono: telefono || null,
                origen,
                proyectoId: proyectoId || null,
                unidadInteres: unidadInteres ? JSON.stringify([unidadInteres]) : "[]",
                orgId,
                notas: mensaje
                    ? JSON.stringify([
                        {
                            fecha: new Date(),
                            texto: `Mensaje inicial: ${mensaje}`,
                            userId: "SYSTEM",
                        },
                    ])
                    : "[]",
            },
        });

        // Automatically create an opportunity if interest exists
        if (proyectoId) {
            await db.oportunidad.create({
                data: {
                    leadId: lead.id,
                    proyectoId: proyectoId,
                    unidadId: unidadInteres || null,
                    etapa: "NUEVO",
                    probabilidad: 10,
                    proximaAccion: "Contactar al cliente",
                },
            });
        }

        // Fire-and-forget: score the lead asynchronously, don't block the response
        aiLeadScoring(lead.id).catch(console.error);

        // Auto-trigger NEW_LEAD workflows for the lead's org (via proyecto)
        if (proyectoId) {
            const proyecto = await db.proyecto.findUnique({
                where: { id: proyectoId },
                select: { orgId: true },
            });
            if (proyecto?.orgId) {
                const workflows = await db.workflow.findMany({
                    where: { orgId: proyecto.orgId, trigger: "NEW_LEAD", activo: true },
                    select: { id: true },
                });
                for (const wf of workflows) {
                    runWorkflow(wf.id, "NEW_LEAD", lead.id).catch(console.error);
                }
            }
        }

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
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const estado = searchParams.get("estado");
        const search = searchParams.get("search");
        const proyectoId = searchParams.get("proyectoId");

        const sessionUser = session.user as any;
        const isAdmin = sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN";

        // A2: Multi-tenant org scoping
        const where: Prisma.LeadWhereInput = isAdmin
            ? {}
            : sessionUser.orgId
                ? { orgId: sessionUser.orgId }
                : { asignadoAId: sessionUser.id }; // legacy fallback

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
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
