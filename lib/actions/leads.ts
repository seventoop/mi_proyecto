"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getLeads(params: {
    page?: number;
    pageSize?: number;
    search?: string;
} = {}) {
    const { page = 1, pageSize = 20, search } = params;
    const skip = (page - 1) * pageSize;

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "No autorizado" };

        const userId = session.user.id;
        const userRole = session.user.role;

        // Si es admin ve todos, si es vendedor/desarrollador ve solo los asignados o de sus proyectos
        const where: any = userRole === "ADMIN" ? {} : {
            OR: [
                { asignadoAId: userId },
                { proyecto: { creadoPorId: userId } }
            ]
        };

        if (search) {
            where.OR = [
                ...(where.OR || []),
                { nombre: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { telefono: { contains: search, mode: "insensitive" } }
            ];
        }

        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                    estado: true,
                    origen: true,
                    createdAt: true,
                    proyecto: { select: { id: true, nombre: true } },
                    asignadoA: { select: { id: true, nombre: true, avatar: true } }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.lead.count({ where })
        ]);

        return {
            success: true,
            data: leads,
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error("Error fetching leads:", error);
        return { success: false, error: "Error al obtener leads" };
    }
}

export async function createLead(data: any) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        // Verify project ownership if ID is provided
        if (data.proyectoId) {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: data.proyectoId },
                select: { creadoPorId: true }
            });
            if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

            if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para crear leads en este proyecto" };
            }
        }

        const newLead = await prisma.lead.create({
            data: {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                proyectoId: data.proyectoId,
                estado: "NUEVO",
                origen: data.origen || "MANUAL",
                asignadoAId: user.id, // Auto-asignar al creador por defecto
                notas: data.notas ? JSON.stringify([{
                    fecha: new Date(),
                    texto: data.notas,
                    userId: user.id
                }]) : null
            }
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");
        return { success: true, data: newLead };
    } catch (error) {
        console.error("Error creating lead:", error);
        return { success: false, error: "Error al crear lead" };
    }
}

export async function updateLeadStatus(leadId: string, newStatus: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: { select: { creadoPorId: true } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && lead.asignadoAId !== user.id && lead.proyecto?.creadoPorId !== user.id) {
            return { success: false, error: "No tienes permisos sobre este lead" };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                estado: newStatus,
                updatedAt: new Date()
            }
        });

        revalidatePath("/dashboard/developer/leads");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar estado" };
    }
}

export async function deleteLead(leadId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: { select: { creadoPorId: true } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && lead.asignadoAId !== user.id && lead.proyecto?.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.lead.delete({
            where: { id: leadId }
        });
        revalidatePath("/dashboard/developer/leads");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar lead" };
    }
}

export async function updateLead(leadId: string, data: any) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { proyecto: { select: { creadoPorId: true } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        // SECURITY CHECK
        if (user.role !== "ADMIN" && lead.asignadoAId !== user.id && lead.proyecto?.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        await prisma.lead.update({
            where: { id: leadId },
            data: {
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                proyectoId: data.proyectoId,
                updatedAt: new Date()
            }
        });
        revalidatePath("/dashboard/developer/leads");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar lead" };
    }
}

export async function bulkCreateLeads(leads: any[], projectId?: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;

        if (!user) return { success: false, error: "No autorizado" };

        // Verify project ownership if ID is provided
        if (projectId) {
            const proyecto = await prisma.proyecto.findUnique({
                where: { id: projectId },
                select: { creadoPorId: true }
            });
            if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

            if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
                return { success: false, error: "No tienes permisos para crear leads en este proyecto" };
            }
        }

        for (const lead of leads) {
            try {
                // Basic validation
                if (!lead.nombre || !lead.email) {
                    errors.push(`Fila ignorada: Falta nombre o email (${lead.email || 'Sin email'})`);
                    continue;
                }

                // Check duplicate
                const existing = await prisma.lead.findFirst({
                    where: {
                        email: lead.email,
                        // Optionally scope by project if strict
                    }
                });

                if (existing) {
                    errors.push(`Duplicado: ${lead.email} ya existe`);
                    continue;
                }

                await prisma.lead.create({
                    data: {
                        nombre: lead.nombre,
                        email: lead.email,
                        telefono: lead.telefono,
                        proyectoId: projectId || lead.proyectoId,
                        estado: "NUEVO",
                        origen: "IMPORTACION",
                        asignadoAId: user.id
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Error al insertar ${lead.email}: ${(err as any).message}`);
            }
        }

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/leads");
        return { success: true, count: successCount, errors };
    } catch (error) {
        console.error("Error bulk creating leads:", error);
        return { success: false, error: "Error general en la importación" };
    }
}
