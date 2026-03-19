"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, handleGuardError, requireOrgAccess, requireCrmRead, requireCrmWrite } from "@/lib/guards";
import { z } from "zod";
import { idSchema, closeOportunidadSchema, updateOportunidadSchema } from "@/lib/validations";
import { createNotification } from "@/lib/actions/notifications";
import { audit } from "@/lib/actions/audit";
import { createReserva } from "@/lib/actions/reservas";

const etapaSchema = z.object({
    nombre: z.string().min(2, "Nombre demasiado corto"),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color inválido"),
    orden: z.number().int().positive()
});

export async function getPipelineEtapas(orgId: string) {
    try {
        await requireCrmRead(orgId);
        const etapas = await prisma.pipelineEtapa.findMany({
            where: { orgId },
            orderBy: { orden: "asc" }
        });
        
        // Serialización segura
        const serialized = etapas.map(e => ({
            ...e,
            createdAt: e.createdAt.toISOString(),
        }));

        return { success: true, data: serialized };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function createPipelineEtapa(orgId: string, input: any) {
    try {
        await requireCrmWrite(orgId);
        const parsed = etapaSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

        const etapa = await prisma.pipelineEtapa.create({
            data: {
                orgId,
                ...parsed.data,
                esDefault: false
            }
        });

        revalidatePath("/dashboard/developer/crm/pipeline");
        return { success: true, data: etapa };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updatePipelineEtapa(etapaId: string, input: any) {
    try {
        const etapa = await prisma.pipelineEtapa.findUnique({
            where: { id: etapaId }
        });
        if (!etapa) return { success: false, error: "Etapa no encontrada" };

        await requireCrmWrite(etapa.orgId);

        const parsed = etapaSchema.partial().safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

        const updated = await prisma.pipelineEtapa.update({
            where: { id: etapaId },
            data: parsed.data
        });

        revalidatePath("/dashboard/developer/crm/pipeline");
        return { success: true, data: updated };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function deletePipelineEtapa(etapaId: string, destEtapaId?: string) {
    try {
        const etapa = await prisma.pipelineEtapa.findUnique({
            where: { id: etapaId },
            include: { _count: { select: { leads: true } } }
        });
        if (!etapa) return { success: false, error: "Etapa no encontrada" };

        await requireCrmWrite(etapa.orgId);

        // Si tiene leads, requiere etapa destino
        if (etapa._count.leads > 0) {
            if (!destEtapaId) return { success: false, error: "Esta etapa tiene leads. Selecciona una etapa de destino para moverlos." };

            const dest = await prisma.pipelineEtapa.findUnique({ where: { id: destEtapaId } });
            if (!dest || dest.orgId !== etapa.orgId) return { success: false, error: "Etapa de destino inválida" };

            await prisma.lead.updateMany({
                where: { etapaId },
                data: { etapaId: destEtapaId }
            });
        }

        await prisma.pipelineEtapa.delete({
            where: { id: etapaId }
        });

        revalidatePath("/dashboard/developer/crm/pipeline");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function reorderPipelineEtapas(orgId: string, etapasOrdenadas: string[]) {
    try {
        await requireOrgAccess(orgId);

        // Update orders sequentially or with Promise.all
        await Promise.all(
            etapasOrdenadas.map((id, index) =>
                prisma.pipelineEtapa.update({
                    where: { id, orgId },
                    data: { orden: index + 1 }
                })
            )
        );

        revalidatePath("/dashboard/developer/crm/pipeline");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function updateLeadEtapa(leadId: string, etapaId: string) {
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { organization: true }
        });
        if (!lead || !lead.orgId) return { success: false, error: "Lead no válido para pipeline" };

        await requireOrgAccess(lead.orgId);

        const etapa = await prisma.pipelineEtapa.findUnique({ where: { id: etapaId } });
        if (!etapa || etapa.orgId !== lead.orgId) return { success: false, error: "Etapa no válida para esta organización" };

        await prisma.lead.update({
            where: { id: leadId },
            data: { etapaId, updatedAt: new Date() }
        });

        revalidatePath("/dashboard/leads");
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function convertLeadToOportunidad(leadId: string, proyectoId: string, unidadId?: string) {
    try {
        const user = await requireAuth();
        const orgId = user.orgId;

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { oportunidades: { where: { proyectoId } } }
        });

        if (!lead) return { success: false, error: "Lead no encontrado" };

        const isAdminCvt = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdminCvt) {
            if (lead.orgId) {
                if (!orgId || lead.orgId !== orgId) return { success: false, error: "Acceso denegado" };
            } else {
                // Lead legacy sin orgId: denegar a no-admin (fail-secure)
                return { success: false, error: "Lead no encontrado" };
            }
        }

        if (lead.oportunidades.length > 0) return { success: false, error: "Ya existe una oportunidad para este lead en este proyecto" };

        const oportunidad = await prisma.oportunidad.create({
            data: {
                leadId,
                proyectoId,
                unidadId: unidadId || null,
                etapa: "CONTACTADO",
                probabilidad: 30,
            }
        });

        await prisma.lead.update({
            where: { id: leadId },
            data: { estado: "EN_PROCESO" }
        });

        revalidatePath("/dashboard/developer/leads");
        revalidatePath("/dashboard/developer/crm/pipeline");
        return { success: true, data: oportunidad };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getCrmMetrics(orgId: string) {
    try {
        await requireOrgAccess(orgId);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalLeads,
            leadsThisMonth,
            leadsByStage,
            leadsByChannel,
            leadsLast30Days,
            oportunidadesTotal,
            leadsWithScore,
            avgDealAgg,
        ] = await Promise.all([
            prisma.lead.count({ where: { orgId } }),
            prisma.lead.count({ where: { orgId, createdAt: { gte: thirtyDaysAgo } } }),
            prisma.lead.groupBy({ by: ['estado'], where: { orgId }, _count: true }),
            prisma.lead.groupBy({ by: ['canalOrigen'], where: { orgId }, _count: true }),
            prisma.lead.findMany({
                where: { orgId, createdAt: { gte: thirtyDaysAgo } },
                select: { createdAt: true }
            }),
            prisma.oportunidad.count({ where: { lead: { orgId } } }),
            prisma.lead.count({ where: { orgId, aiQualificationScore: { gt: 0 } } }),
            prisma.reserva.aggregate({
                where: { unidad: { manzana: { etapa: { proyecto: { organization: { id: orgId } } } } } },
                _avg: { montoSena: true }
            }),
        ]);

        const conversionRate = totalLeads > 0
            ? Math.round((oportunidadesTotal / totalLeads) * 1000) / 10
            : 0;

        const topStage = leadsByStage.length > 0
            ? (leadsByStage.reduce((a: any, b: any) => (a._count > b._count ? a : b)) as any).estado
            : null;

        const avgDealValue = Number(avgDealAgg._avg.montoSena ?? 0);

        return {
            success: true,
            data: {
                totalLeads,
                leadsThisMonth,
                leadsByStage: leadsByStage.map(l => ({ ...l, _count: l._count })), // Explicit count
                leadsByChannel: leadsByChannel.map(l => ({ ...l, _count: l._count })),
                leadsLast30Days: leadsLast30Days.map(l => ({ 
                    createdAt: l.createdAt.toISOString() 
                })),
                conversionRate,
                leadsWithScore,
                avgDealValue,
                topStage,
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Closes an Oportunidad by creating a linked Reserva, advancing the Lead to CONVERTIDO,
 * and moving the Oportunidad stage to RESERVA.
 * Reuses createReserva (atomic unit lock, permission check, audit).
 */
export async function closeOportunidad(
    oportunidadId: string,
    rawInput: { unidadId: string; montoSena: number; fechaVencimiento?: string }
) {
    try {
        const user = await requireAuth();

        const parsed = closeOportunidadSchema.safeParse(rawInput);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
        const input = parsed.data;

        const oportunidad = await prisma.oportunidad.findUnique({
            where: { id: oportunidadId },
            include: {
                lead: { select: { id: true, orgId: true, asignadoAId: true, nombre: true } }
            }
        });
        if (!oportunidad) return { success: false, error: "Oportunidad no encontrada" };

        const lead = oportunidad.lead;

        // Org isolation
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            if (!lead.orgId || lead.orgId !== user.orgId) {
                return { success: false, error: "Acceso denegado" };
            }
        }

        if (oportunidad.etapa === "RESERVA" || oportunidad.etapa === "VENTA") {
            return { success: false, error: "Esta oportunidad ya fue convertida a reserva" };
        }

        const unidadId = input.unidadId;
        const fechaVencimiento = input.fechaVencimiento
            ?? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        // Reuse createReserva: handles atomic unit lock, RESERVAR permission, historialUnidad, audit
        const reservaResult = await createReserva({
            unidadId,
            leadId: lead.id,
            montoSena: input.montoSena,
            fechaVencimiento,
        });

        if (!reservaResult.success) {
            return { success: false, error: (reservaResult as any).error ?? "Error al crear la reserva" };
        }

        const reservaId = (reservaResult as any).data?.id;

        // Find "Convertido" pipeline stage for this org (if configured)
        const etapaConvertido = lead.orgId
            ? await prisma.pipelineEtapa.findFirst({
                where: { orgId: lead.orgId, nombre: { contains: "Conver", mode: "insensitive" } }
            })
            : null;

        // Advance Lead + Oportunidad atomically
        await prisma.$transaction([
            prisma.lead.update({
                where: { id: lead.id },
                data: {
                    estado: "CONVERTIDO",
                    ...(etapaConvertido ? { etapaId: etapaConvertido.id } : {}),
                }
            }),
            prisma.oportunidad.update({
                where: { id: oportunidadId },
                data: { etapa: "RESERVA" }
            }),
        ]);

        // Notify vendedor (assigned user) if present
        if (lead.asignadoAId) {
            await createNotification(
                lead.asignadoAId,
                "EXITO",
                "Oportunidad convertida a reserva",
                `La oportunidad de ${lead.nombre} fue convertida a reserva. Pendiente de aprobación.`,
                "/dashboard/developer/reservas"
            );
        }

        await audit({
            userId: user.id,
            action: "OPORTUNIDAD_CLOSED",
            entity: "Oportunidad",
            entityId: oportunidadId,
            details: { unidadId, leadId: lead.id, reservaId },
        });

        revalidatePath("/dashboard/developer/oportunidades");
        revalidatePath("/dashboard/developer/reservas");
        revalidatePath("/dashboard/developer/leads");

        return { success: true, data: { reservaId } };
    } catch (error) {
        return handleGuardError(error);
    }
}

/**
 * Updates operational fields on an Oportunidad (stage, probability, value, dates).
 * Used by the kanban card interactive controls.
 */
export async function updateOportunidad(
    oportunidadId: string,
    rawInput: unknown
) {
    try {
        const user = await requireAuth();

        const parsed = updateOportunidadSchema.safeParse(rawInput);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
        const input = parsed.data;

        const oportunidad = await prisma.oportunidad.findUnique({
            where: { id: oportunidadId },
            include: { lead: { select: { orgId: true } } }
        });
        if (!oportunidad) return { success: false, error: "Oportunidad no encontrada" };

        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin) {
            if (!oportunidad.lead?.orgId || oportunidad.lead.orgId !== user.orgId) {
                return { success: false, error: "Acceso denegado" };
            }
        }

        const updated = await prisma.oportunidad.update({
            where: { id: oportunidadId },
            data: {
                ...(input.probabilidad !== undefined ? { probabilidad: input.probabilidad } : {}),
                ...(input.valorEstimado !== undefined ? { valorEstimado: input.valorEstimado } : {}),
                ...(input.fechaCierreEstimada ? { fechaCierreEstimada: new Date(input.fechaCierreEstimada) } : {}),
                ...(input.proximaAccion !== undefined ? { proximaAccion: input.proximaAccion } : {}),
                ...(input.etapa ? { etapa: input.etapa } : {}),
            }
        });

        revalidatePath("/dashboard/developer/oportunidades");
        return { success: true, data: { id: updated.id, etapa: updated.etapa } };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function addLeadNote(leadId: string, contenido: string) {
    try {
        const idParsed = idSchema.safeParse(leadId);
        if (!idParsed.success) return { success: false, error: "ID de lead inválido" };

        const contentParsed = z.string().min(1, "La nota no puede estar vacía").max(2000).safeParse(contenido);
        if (!contentParsed.success) return { success: false, error: contentParsed.error.issues[0].message };

        const user = await requireAuth();

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: { orgId: true }
        });
        if (!lead) return { success: false, error: "Lead no encontrado" };

        const isAdminNote = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdminNote) {
            if (lead.orgId) {
                if (!user.orgId || lead.orgId !== user.orgId) {
                    return { success: false, error: "Acceso denegado" };
                }
            } else {
                // Lead legacy sin orgId: denegar a no-admin (fail-secure)
                return { success: false, error: "Acceso denegado" };
            }
        }

        const message = await prisma.leadMessage.create({
            data: {
                leadId,
                role: "note",
                content: contentParsed.data
            }
        });

        revalidatePath("/dashboard/leads");
        revalidatePath("/dashboard/developer/leads");
        return { success: true, data: message };
    } catch (error) {
        return handleGuardError(error);
    }
}
