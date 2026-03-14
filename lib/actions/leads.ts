"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError, requireProjectOwnership } from "@/lib/guards";
import { z } from "zod";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { idSchema, leadSchema, leadUpdateSchema, leadBulkItemSchema } from "@/lib/validations";

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

        // Multi-tenant scoping:
        // ADMIN/SUPERADMIN → see all leads
        // Users with orgId → see all leads in their org (primary filter)
        // Users without orgId (legacy) → see only leads assigned to them or their projects
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        const where: any = isAdmin ? {} : {
            AND: [
                user.orgId ? { orgId: user.orgId } : {},
                {
                    OR: [
                        { asignadoAId: user.id },
                        { proyecto: { creadoPorId: user.id } }
                    ]
                }
            ]
        };

        if (search) {
            const searchConditions = [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } }
            ];

            if (isAdmin) {
                where.OR = searchConditions;
            } else if (user.orgId) {
                // org filter already set via where.orgId — add search as AND
                where.AND = [{ OR: searchConditions }];
            } else {
                // Legacy fallback: intersect role conditions with search
                const roleConditions = where.OR;
                where.AND = [
                    { OR: roleConditions },
                    { OR: searchConditions }
                ];
                delete where.OR;
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
                    asignadoA: { select: { nombre: true } }
                }
            }),
            prisma.lead.count({ where })
        ]);

        return {
            success: true,
            data: {
                leads,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
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

        const lead = await prisma.lead.create({
            data: {
                nombre: data.nombre,
                email: data.email || null,
                telefono: data.telefono || null,
                proyectoId: data.proyectoId || null,
                estado: data.estado || "NUEVO",
                origen: data.origen || "WEB",
                asignadoAId: user.id,
                orgId: user.orgId
            }
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");

        return { success: true, data: lead };
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
            select: { orgId: true, asignadoAId: true, proyecto: { select: { creadoPorId: true } } }
        });

        if (!existing) return { success: false, error: "Lead no encontrado" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            // Primary: org isolation
            if (existing.orgId && user.orgId && existing.orgId !== user.orgId) {
                return { success: false, error: "No tienes permisos para editar este lead" };
            }
            // Secondary: user-level ownership within the org
            if (existing.asignadoAId !== user.id && existing.proyecto?.creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para editar este lead" };
            }
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                ...data,
                updatedAt: new Date()
            }
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

                await prisma.lead.create({
                    data: {
                        nombre: lead.nombre,
                        email: lead.email || null,
                        telefono: lead.telefono || null,
                        proyectoId: projectId || null,
                        estado: "NUEVO",
                        origen: "IMPORTACION",
                        asignadoAId: user.id,
                        orgId: user.orgId
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Error al insertar ${leadData.email || 'lead'}: ${(err as any).message}`);
            }
        }

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
            select: { orgId: true, asignadoAId: true, proyecto: { select: { creadoPorId: true } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            // Primary: org isolation
            if (lead.orgId && user.orgId && lead.orgId !== user.orgId) {
                return { success: false, error: "No tienes permisos para eliminar este lead" };
            }
            // Secondary: user-level ownership within the org
            if (lead.asignadoAId !== user.id && lead.proyecto?.creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para eliminar este lead" };
            }
        }

        await prisma.lead.delete({
            where: { id: leadId }
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
        const headersList = headers();
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

        // A2 strategy: NO fallback to main org for production leads.
        // If no project/org context, move to LeadIntake quarantine.
        if (!mainOrgId) {
            await prisma.leadIntake.create({
                data: {
                    source: "LANDING",
                    rawPayload: data as any,
                    status: "PENDING",
                    error: "No se pudo resolver el orgId para esta consulta de landing."
                }
            });

            await prisma.auditLog.create({
                data: {
                    userId: "system",
                    action: "TENANT_RESOLUTION_FAILED",
                    entity: "Lead",
                    details: JSON.stringify({ source: "landing", data })
                }
            });

            return { success: true }; // Silent success for UI
        }

        await prisma.lead.create({
            data: {
                nombre: data.nombre,
                telefono: data.whatsapp,
                origen: data.origen || "formulario_landing",
                canalOrigen: "WEB",
                mensaje: mensajeFormateado,
                estado: "NUEVO",
                notas: JSON.stringify(jsonMetadata),
                orgId: mainOrgId,
            }
        });

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
        const headersList = headers();
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

        if (!orgId) {
            await prisma.leadIntake.create({
                data: {
                    source: "CONTACT",
                    rawPayload: data as any,
                    status: "PENDING",
                    error: "No se pudo resolver el orgId para esta consulta de contacto (sin proyecto asociado)."
                }
            });

            await prisma.auditLog.create({
                data: {
                    userId: "system",
                    action: "TENANT_RESOLUTION_FAILED",
                    entity: "Lead",
                    details: JSON.stringify({ source: "contacto", data })
                }
            });

            return { success: true };
        }

        await prisma.lead.create({
            data: {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                proyectoId: data.proyectoId || null,
                origen: data.origen || "contacto",
                canalOrigen: "WEB",
                estado: "NUEVO",
                mensaje: mensajeFormateado,
                orgId,
            }
        });

        return { success: true };
    } catch (e: any) {
        console.error("Error creating contact lead:", e);
        return { success: false, error: e.message || "Error al enviar la consulta" };
    }
}
