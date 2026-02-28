"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError, requireProjectOwnership } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Scemas ───

const leadSchema = z.object({
    nombre: z.string().min(2, "Nombre demasiado corto").max(100),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
    telefono: z.string().max(30).optional().nullable(),
    proyectoId: idSchema.optional().nullable(),
    estado: z.string().optional().default("NUEVO"),
    origen: z.string().optional().default("WEB")
});

const leadUpdateSchema = leadSchema.partial();

const leadBulkItemSchema = z.object({
    nombre: z.string().min(1, "Nombre requerido"),
    email: z.string().email("Email inválido").or(z.literal("")),
    telefono: z.string().optional().nullable(),
});

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

        // Si es admin ve todos, si es vendedor/desarrollador ve solo los asignados o de sus proyectos
        const where: any = user.role === "ADMIN" ? {} : {
            OR: [
                { asignadoAId: user.id },
                { proyecto: { creadoPorId: user.id } }
            ]
        };

        if (search) {
            const searchConditions = [
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } }
            ];

            if (user.role === "ADMIN") {
                where.OR = searchConditions;
            } else {
                // If already has OR from roles, we need to intersect or wrap
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

        const lead = await prisma.lead.create({
            data: {
                nombre: data.nombre,
                email: data.email || null,
                telefono: data.telefono || null,
                proyectoId: data.proyectoId || null,
                estado: data.estado || "NUEVO",
                origen: data.origen || "WEB",
                asignadoAId: user.id
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

        // Verify lead ownership or admin
        const existing = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { asignadoAId: true, proyecto: { select: { creadoPorId: true } } }
        });

        if (!existing) return { success: false, error: "Lead no encontrado" };

        if (user.role !== "ADMIN" && existing.asignadoAId !== user.id && existing.proyecto?.creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para editar este lead" };
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

                // Check duplicate by email (if email provided)
                if (lead.email) {
                    const existing = await prisma.lead.findFirst({
                        where: { email: lead.email }
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
                        asignadoAId: user.id
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
            select: { asignadoAId: true, proyecto: { select: { creadoPorId: true } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        // Permisos: Admin, Asignado o Dueño del proyecto
        if (user.role !== "ADMIN" && lead.asignadoAId !== user.id && lead.proyecto?.creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos para eliminar este lead" };
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
