"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError, requireProjectOwnership } from "@/lib/guards";
import { z } from "zod";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { idSchema, leadSchema, leadUpdateSchema, leadBulkItemSchema } from "@/lib/validations";
import { executeLeadReception } from "@/lib/crm-pipeline";
import { audit } from "@/lib/actions/audit";
import { getProjectAccess, ProjectPermission } from "@/lib/project-access";

// ─── Queries ───

export async function getLeads(params: {
    page?: number;
    pageSize?: number;
    search?: string;
} = {}) {
    const { page = 1, pageSize = 20, search } = params;
    const skip = (page - 1) * pageSize;

    try {
        const user = await requireAuth();

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";

        let where: any;

        if (isAdmin) {
            // ADMIN/SUPERADMIN: see all leads without any restriction
            where = {};
        } else if (!user.orgId) {
            // Legacy: no org → only own assigned leads or leads on own projects (creadoPorId)
            where = {
                OR: [
                    { asignadoAId: user.id },
                    { proyecto: { creadoPorId: user.id } },
                ],
            };
        } else {
            // Relation-based scoping within the org:
            //   permisoVerLeadsGlobales=true  → see ALL leads for that project
            //   permisoVerLeadsGlobales=false → see only own assigned leads for that project
            //   legacy (creadoPorId, no relation row) → see all leads (treated as implicit OWNER)
            const relaciones = await prisma.proyectoUsuario.findMany({
                where: { userId: user.id, orgId: user.orgId, estadoRelacion: "ACTIVA" },
                select: { proyectoId: true, permisoVerLeadsGlobales: true },
            });

            const globalProyectoIds = relaciones
                .filter(r => r.permisoVerLeadsGlobales)
                .map(r => r.proyectoId);

            const restrictedProyectoIds = relaciones
                .filter(r => !r.permisoVerLeadsGlobales)
                .map(r => r.proyectoId);

            where = {
                orgId: user.orgId,
                OR: [
                    // All leads for projects where user has global visibility
                    ...(globalProyectoIds.length > 0
                        ? [{ proyectoId: { in: globalProyectoIds } }]
                        : []),
                    // Only own leads for projects where user has restricted visibility
                    ...(restrictedProyectoIds.length > 0
                        ? [{ proyectoId: { in: restrictedProyectoIds }, asignadoAId: user.id }]
                        : []),
                    // Directly assigned leads (no project context)
                    { asignadoAId: user.id },
                    // Legacy fallback: projects where user is creator but has no relation row
                    { proyecto: { creadoPorId: user.id } },
                ],
            };
        }

        // Apply search filter
        if (search) {
            const searchConditions = [
                { nombre:   { contains: search, mode: "insensitive" } },
                { email:    { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } },
            ];
            if (isAdmin) {
                where.OR = searchConditions;
            } else {
                where = { AND: [where, { OR: searchConditions }] };
            }
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: "desc" },
                include: {
                    proyecto: { select: { nombre: true } },
                    asignadoA: { select: { nombre: true } },
                },
            }),
            prisma.lead.count({ where }),
        ]);

        return {
            success: true,
            data: {
                leads,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations ───

export async function createLead(input: unknown) {
    try {
        const user = await requireAuth();
        const parsed = leadSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }

        const data = parsed.data;

        if (!user.orgId) {
            throw new Error("El usuario no tiene una organización asignada. No se pueden crear leads sin tenant.");
        }

        // If a project is specified, check puedeCaptarLeads.
        // If captación is disabled, the lead is quarantined to LeadIntake instead of created directly.
        if (data.proyectoId) {
            const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
            if (!isAdmin) {
                const ctx = await getProjectAccess(user, data.proyectoId);
                if (!ctx.can(ProjectPermission.CAPTAR_LEADS)) {
                    // Route to LeadIntake quarantine — preserve data without blocking the form
                    const intake = await (prisma as any).leadIntake.create({
                        data: {
                            source: "MANUAL",
                            rawPayload: { ...data, captadorId: user.id },
                            status: "PENDING",
                            error: `Captación deshabilitada para proyecto ${data.proyectoId} (estado: ${ctx.proyecto.estadoValidacion})`,
                        },
                    });
                    await audit({
                        userId: user.id,
                        action: "LEAD_QUARANTINED",
                        entity: "LeadIntake",
                        entityId: intake.id,
                        details: { proyectoId: data.proyectoId, estadoValidacion: ctx.proyecto.estadoValidacion },
                    });
                    return { success: true, data: { id: intake.id, quarantined: true } };
                }
            }
        }

        const result = await executeLeadReception({
            nombre: data.nombre,
            email: data.email || null,
            telefono: data.telefono || null,
            proyectoId: data.proyectoId || null,
            estado: data.estado || "NUEVO",
            origen: data.origen || "WEB",
            asignadoAId: user.id,
            orgId: user.orgId,
            sourceType: "MANUAL"
        });

        if (!result.success) {
            throw new Error(result.error || "Error al crear el lead en el pipeline");
        }

        await audit({
            userId: user.id,
            action: "LEAD_CREATED",
            entity: "Lead",
            entityId: result.leadId,
            details: { origen: data.origen, proyectoId: data.proyectoId ?? null },
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");

        return { success: true, data: { id: result.leadId } };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateLead(leadId: string, input: unknown) {
    try {
        const idParsed = idSchema.safeParse(leadId);
        if (!idParsed.success) return { success: false, error: "ID de lead inválido" };

        const user = await requireAuth();
        const parsed = leadUpdateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }

        const data = parsed.data;

        // Verify lead access: org isolation first, then ownership
        const existing = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { orgId: true, asignadoAId: true, proyectoId: true }
        });

        if (!existing) return { success: false, error: "Lead no encontrado" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            if (existing.orgId) {
                // Primary: org isolation — symmetric fail-secure check
                if (!user.orgId || existing.orgId !== user.orgId) {
                    return { success: false, error: "No tienes permisos para editar este lead" };
                }
            } else {
                // Lead legacy sin orgId: denegar acceso a no-admin (fail-secure)
                return { success: false, error: "No tienes permisos para editar este lead" };
            }
            // Secondary: assigned vendor (own) OR global lead access on the project.
            // Legacy creadoPorId fallback is inside getProjectAccess.
            const isAssigned = existing.asignadoAId === user.id;
            if (!isAssigned) {
                if (!existing.proyectoId) {
                    return { success: false, error: "No tienes permisos para editar este lead" };
                }
                const ctx = await getProjectAccess(user, existing.proyectoId);
                if (!ctx.can(ProjectPermission.VER_LEADS_GLOBALES)) {
                    return { success: false, error: "No tienes permisos para editar este lead" };
                }
            }
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });

        await audit({
            userId: user.id,
            action: "LEAD_UPDATE",
            entity: "Lead",
            entityId: leadId,
            details: { campos: Object.keys(data) },
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");

        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function bulkCreateLeads(leads: any[], projectId?: string) {
    try {
        const user = await requireAuth();

        // Verify project ownership if ID is provided
        if (projectId) {
            const pidParsed = idSchema.safeParse(projectId);
            if (!pidParsed.success) return { success: false, error: "ID de proyecto inválido" };
            await requireProjectOwnership(projectId);
        }

        const errors: string[] = [];
        let successCount = 0;

        for (const leadData of leads) {
            try {
                const parsed = leadBulkItemSchema.safeParse(leadData);
                if (!parsed.success) {
                    errors.push(`Fila inválida (${leadData.email || 'Sin email'}): ${parsed.error.issues[0].message}`);
                    continue;
                }

                const lead = parsed.data;

                // Check duplicate by email within the same org
                if (lead.email) {
                    const existing = await prisma.lead.findFirst({
                        where: {
                            email: lead.email,
                            ...(user.orgId ? { orgId: user.orgId } : {}),
                        }
                    });
                    if (existing) {
                        errors.push(`Duplicado: ${lead.email} ya existe`);
                        continue;
                    }
                }

                const result = await executeLeadReception({
                    nombre: lead.nombre,
                    email: lead.email || null,
                    telefono: lead.telefono || null,
                    proyectoId: projectId || null,
                    origen: "IMPORTACION",
                    canalOrigen: "WEB",
                    asignadoAId: user.id,
                    orgId: user.orgId,
                    sourceType: "BULK",
                    skipAutomations: true // No spamear webhooks/IA para bulk
                });
                
                if (!result.success) {
                    throw new Error(result.error);
                }
                successCount++;
            } catch (err) {
                errors.push(`Error al insertar ${leadData.email || 'lead'}: ${(err as any).message}`);
            }
        }

        await audit({
            userId: user.id,
            action: "LEAD_BULK_CREATE",
            entity: "Lead",
            details: { count: successCount, errores: errors.length, proyectoId: projectId ?? null },
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");

        return {
            success: true,
            data: {
                count: successCount,
                errors: errors.length > 0 ? errors : undefined
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deleteLead(leadId: string) {
    try {
        const idParsed = idSchema.safeParse(leadId);
        if (!idParsed.success) return { success: false, error: "ID de lead inválido" };

        const user = await requireAuth();

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { orgId: true, asignadoAId: true, proyectoId: true }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            if (lead.orgId) {
                // Primary: org isolation — symmetric fail-secure check
                if (!user.orgId || lead.orgId !== user.orgId) {
                    return { success: false, error: "No tienes permisos para eliminar este lead" };
                }
            } else {
                // Lead legacy sin orgId: denegar acceso a no-admin (fail-secure)
                return { success: false, error: "No tienes permisos para eliminar este lead" };
            }
            // Secondary: assigned vendor (own) OR global lead access on the project.
            // Legacy creadoPorId fallback is inside getProjectAccess.
            const isAssigned = lead.asignadoAId === user.id;
            if (!isAssigned) {
                if (!lead.proyectoId) {
                    return { success: false, error: "No tienes permisos para eliminar este lead" };
                }
                const ctx = await getProjectAccess(user, lead.proyectoId);
                if (!ctx.can(ProjectPermission.VER_LEADS_GLOBALES)) {
                    return { success: false, error: "No tienes permisos para eliminar este lead" };
                }
            }
        }

        await prisma.lead.delete({
            where: { id: leadId }
        });

        await audit({
            userId: user.id,
            action: "LEAD_DELETE",
            entity: "Lead",
            entityId: leadId,
            details: { orgId: lead.orgId ?? null },
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");

        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateLeadStatus(leadId: string, status: string) {
    return updateLead(leadId, { estado: status });
}

export type ActionResponse = {
    success: boolean;
    error?: string;
    data?: any;
};

export async function crearLeadLanding(data: {
    nombre: string;
    whatsapp: string;
    provincia: string;
    ciudad: string;
    zona: string;
    intencion: "VIVIR" | "INVERTIR";
    categoriaProyecto: string;
    subtipoProyecto: string;
    presupuestoMinUsd: number;
    presupuestoMaxUsd: number;
    origen?: string;
}): Promise<ActionResponse> {
    try {
        // Rate limiting: 5 submissions per IP per 10 minutes
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
            || headersList.get("x-real-ip")
            || "unknown";
        const { allowed } = await checkRateLimit(ip, {
            limit: 5,
            windowMs: 10 * 60 * 1000,
            keyPrefix: "lead_landing:",
        });
        if (!allowed) {
            return { success: false, error: "Demasiadas solicitudes. Intentá de nuevo en unos minutos." };
        }

        const proyectosRelacionados = await prisma.proyecto.findFirst({
            where: {
                estado: { in: ["ACTIVO", "PROXIMO"] },
                OR: [
                    { ubicacion: { contains: data.ciudad, mode: "insensitive" } },
                    { ubicacion: { contains: data.provincia, mode: "insensitive" } },
                    { ubicacion: { contains: data.zona, mode: "insensitive" } },
                ]
            }
        });

        const zonaSinOferta = !proyectosRelacionados;

        // Metadata estructurada para CRM
        const jsonMetadata = {
            zonaFull: `${data.zona}, ${data.ciudad}, ${data.provincia}`,
            zonaNivel: data.zona,
            intencion: data.intencion,
            categoriaProyecto: data.categoriaProyecto,
            subtipoProyecto: data.subtipoProyecto,
            presupuestoMinUsd: data.presupuestoMinUsd,
            presupuestoMaxUsd: data.presupuestoMaxUsd,
            zonaSinOferta
        };

        const mensajeFormateado = `Intención: ${data.intencion} | Busca: ${data.categoriaProyecto} (${data.subtipoProyecto}) | Presupuesto: USD ${data.presupuestoMinUsd} - ${data.presupuestoMaxUsd} | Zona: ${data.zona}, ${data.ciudad}, ${data.provincia} | Zona sin oferta: ${zonaSinOferta ? "Sí" : "No"}`;

        const mainOrgId = process.env.SEVENTOOP_MAIN_ORG_ID ?? null;

        const result = await executeLeadReception({
            nombre: data.nombre,
            telefono: data.whatsapp,
            origen: data.origen || "formulario_landing",
            canalOrigen: "WEB",
            notas: JSON.stringify(jsonMetadata),
            mensaje: mensajeFormateado,
            orgId: mainOrgId,
            sourceType: "LANDING",
            rawPayloadForIntake: data
        });

        if (!result.success && result.status !== "QUARANTINED") {
            throw new Error(result.error || "Error al procesar lead publico");
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error creating landing lead:", e);
        return { success: false, error: e.message || "Error al crear consulta" };
    }
}

export async function crearConsultaContacto(data: {
    nombre: string;
    email: string;
    telefono: string;
    asunto?: string;
    mensaje: string;
    proyectoId?: string;
    origen?: string;
}): Promise<ActionResponse> {
    try {
        // Rate limiting: 5 submissions per IP per 10 minutes
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
            || headersList.get("x-real-ip")
            || "unknown";
        const { allowed } = await checkRateLimit(ip, {
            limit: 5,
            windowMs: 10 * 60 * 1000,
            keyPrefix: "lead_contacto:",
        });
        if (!allowed) {
            return { success: false, error: "Demasiadas solicitudes. Intentá de nuevo en unos minutos." };
        }

        const mensajeFormateado = data.asunto
            ? `[Asunto: ${data.asunto.toUpperCase()}] ${data.mensaje}`
            : data.mensaje;

        // A2 strategy: If no orgId resolved from project, move to LeadIntake quarantine.
        let orgId: string | null = null;
        if (data.proyectoId) {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: data.proyectoId },
                select: { orgId: true },
            });
            if (proyecto?.orgId) orgId = proyecto.orgId;
        }

        const result = await executeLeadReception({
            nombre: data.nombre,
            email: data.email,
            telefono: data.telefono,
            proyectoId: data.proyectoId || null,
            origen: data.origen || "contacto",
            canalOrigen: "WEB",
            mensaje: mensajeFormateado,
            orgId,
            sourceType: "CONTACTO",
            rawPayloadForIntake: data
        });

        if (!result.success && result.status !== "QUARANTINED") {
             throw new Error(result.error || "Error al procesar consulta de contacto");
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error creating contact lead:", e);
        return { success: false, error: e.message || "Error al enviar la consulta" };
    }
}
