"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireAnyRole, handleGuardError, orgFilter } from "@/lib/guards";
import { audit } from "@/lib/actions/audit";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import { createNotification } from "./notifications";

// ─── Schemas ───

const inversionCreateSchema = z.object({
    proyectoId: idSchema,
    m2Comprados: z.number().positive("Los m2 deben ser mayores a cero"),
    montoTotal: z.number().positive("El monto total debe ser positivo"),
    metodoPago: z.string().min(1, "Método de pago requerido"),
    comprobanteUrl: z.string().url("URL de comprobante inválida").optional().or(z.literal("")),
});

// ─── Mutations ───

export async function crearInversion(input: unknown) {
    try {
        const user = await requireAuth();

        const parsed = inversionCreateSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // 🛡️ SECURITY: Verificar KYC del inversor O Periodo Demo
        const { isKycVerifiedOrDemoActive } = await import("@/lib/actions/kyc");
        const isAllowed = await isKycVerifiedOrDemoActive();

        if (!isAllowed) {
            return {
                success: false,
                error: "Tu cuenta debe estar VERIFICADA por KYC para realizar inversiones (o estar en período de prueba de 48h)."
            };
        }

        // Verificar proyecto
        const proyecto = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            select: {
                invertible: true,
                m2VendidosInversores: true,
                metaM2Objetivo: true,
                precioM2Inversor: true,
                orgId: true
            }
        });

        if (!proyecto || !proyecto.invertible) {
            return { success: false, error: "El proyecto no admite inversiones" };
        }

        // Validar límite
        const m2Vendidos = Number(proyecto.m2VendidosInversores) || 0;
        const metaM2 = Number(proyecto.metaM2Objetivo) || 0;
        const nuevoTotal = m2Vendidos + data.m2Comprados;

        if (nuevoTotal > metaM2) {
            return { success: false, error: "La inversión excede la meta del proyecto" };
        }

        // Crear inversión en estado PENDIENTE
        const inversion = await prisma.inversion.create({
            data: {
                proyectoId: data.proyectoId,
                inversorId: user.id,
                m2Comprados: data.m2Comprados,
                montoTotal: data.montoTotal,
                estado: "PENDIENTE",
                fechaInversion: new Date(),
                precioM2Aplicado: proyecto.precioM2Inversor || 0,
            }
        });

        await audit({
            userId: user.id,
            action: "INVESTMENT_CREATE",
            entity: "Inversion",
            entityId: inversion.id,
            details: { m2: data.m2Comprados, monto: data.montoTotal, proyectoId: data.proyectoId }
        });

        // LogicToop Integration: INVESTOR_INTERESTED trigger
        if (proyecto?.orgId) {
            const { dispatchTrigger } = await import("@/lib/logictoop/dispatcher");
            dispatchTrigger("INVESTOR_INTERESTED", { 
                inversionId: inversion.id, 
                proyectoId: data.proyectoId, 
                m2: data.m2Comprados, 
                monto: data.montoTotal,
                userId: user.id
            }, proyecto.orgId).catch(console.error);
        }

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        revalidatePath("/dashboard/inversor/mis-inversiones");

        // Notify Admins
        const admins = await prisma.user.findMany({
            where: { rol: "ADMIN" },
            select: { id: true }
        });

        for (const admin of admins) {
            await createNotification(
                admin.id,
                "INFO",
                "Nueva Inversión Registrada",
                `Un usuario ha registrado una inversión de ${data.m2Comprados} m2 en el proyecto.`,
                `/dashboard/admin/proyectos/${data.proyectoId}`
            );
        }

        return { success: true, data: inversion };
    } catch (error) {
        console.error("Error creating inversion:", error);
        return { success: false, error: "Error al registrar inversión" };
    }
}

export async function confirmarInversion(id: string) {
    try {
        const idParsed = idSchema.safeParse(id);
        if (!idParsed.success) return { success: false, error: "ID de inversión inválido" };

        const user = await requireRole("ADMIN");

        // Iniciar transacción: Actualizar estado y sumar m2 al proyecto
        const result = await prisma.$transaction(async (tx) => {
            const inversion = await tx.inversion.update({
                where: { id },
                data: { estado: "EN_ESCROW" }
            });

            const proyecto = await tx.proyecto.update({
                where: { id: inversion.proyectoId },
                data: {
                    m2VendidosInversores: { increment: inversion.m2Comprados as any }
                }
            });

            return { inversion, proyecto };
        });

        await audit({
            userId: user.id,
            action: "INVESTMENT_CONFIRM",
            entity: "Inversion",
            entityId: id,
            details: { m2: result.inversion.m2Comprados, proyectoId: result.inversion.proyectoId }
        });

        // Notify Investor
        await createNotification(
            result.inversion.inversorId,
            "EXITO",
            "Inversión Confirmada 🌟",
            `Tu inversión en "${result.proyecto.nombre}" ha sido confirmada y los fondos ya están en escrow.`,
            "/dashboard/inversor/mis-inversiones",
            true // Send Email
        );

        revalidatePath(`/dashboard/proyectos/${result.inversion.proyectoId}`);
        return { success: true, data: result.inversion };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Queries ───

export async function getInversionesPorProyecto(proyectoId: string) {
    try {
        const user = await requireAuth();
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY: Only Admin or Owner or same Org
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id && (proyecto as any).orgId !== user.orgId) {
            return { success: false, error: "No autorizado" };
        }

        const inversiones = await prisma.inversion.findMany({
            where: { proyectoId },
            include: {
                inversor: {
                    select: {
                        nombre: true,
                        email: true
                    }
                }
            },
            orderBy: { fechaInversion: "desc" }
        });

        return { success: true, data: inversiones };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getMisInversiones() {
    try {
        const user = await requireAuth();

        const inversiones = await prisma.inversion.findMany({
            where: { inversorId: user.id },
            include: {
                proyecto: {
                    select: {
                        nombre: true,
                        estado: true,
                        imagenPortada: true,
                        ubicacion: true
                    }
                }
            },
            orderBy: { fechaInversion: "desc" }
        });

        return { success: true, data: inversiones };
    } catch (error) {
        return handleGuardError(error);
    }
}
