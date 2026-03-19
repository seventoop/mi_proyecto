"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole, requireProjectOwnership, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const retiroSchema = z.object({
    proyectoId: idSchema,
    cuentaId: z.string().min(1, "ID de cuenta requerido"),
    monto: z.number().positive("El monto debe ser positivo"),
    concepto: z.string().max(200).optional(),
});

const paymentSchema = z.object({
    proyectoId: idSchema,
    usuarioId: idSchema,
    monto: z.number().positive("El monto debe ser positivo"),
    comprobanteUrl: z.string().url("URL de comprobante inválida"),
    metodo: z.string().min(1, "Método de pago requerido"),
});

// ─── Shared Audit Helper ───

async function createAuditLog(userId: string, action: string, entity: string, entityId: string | null, details: any) {
    try {
        await (prisma as any).auditLog.create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: JSON.stringify(details),
            }
        });
    } catch (error) {
        console.error("Failed to create audit log:", error);
    }
}

// ─── SOLICITUDES DE RETIRO (Project specific) ───

/**
 * DISABLED: No payment gateway configured.
 * Withdrawal requests are blocked until a real gateway is integrated.
 */
export async function solicitarRetiro(_input: unknown) {
    return {
        success: false,
        error: "Función deshabilitada. Los retiros estarán disponibles cuando se integre la pasarela de pago."
    };
}

// ─── PAGOS DE ACTIVACIÓN / RECEPCIÓN ───

export async function createPayment(input: unknown) {
    try {
        const parsed = paymentSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        const user = await requireAuth();

        if (user.role !== "ADMIN" && user.id !== data.usuarioId) {
            const proyecto = await prisma.proyecto.findUnique({ where: { id: data.proyectoId }, select: { creadoPorId: true } });
            if (proyecto?.creadoPorId !== user.id) {
                return { success: false, error: "No autorizado para registrar este pago" };
            }
        }

        await prisma.$transaction(async (tx) => {
            const pago = await tx.pago.create({
                data: {
                    proyectoId: data.proyectoId,
                    usuarioId: data.usuarioId,
                    monto: data.monto,
                    moneda: "USD",
                    comprobanteUrl: data.comprobanteUrl,
                    estado: "PENDIENTE",
                    tipo: "PROJECT_ACTIVATION",
                    concepto: `Activación de Proyecto - Método: ${data.metodo}`,
                    fechaPago: new Date()
                } as any
            });

            await tx.proyecto.update({
                where: { id: data.proyectoId },
                data: { estado: "PENDIENTE_PAGO" }
            });

            // ─── TAREA 10: Audit Log ───
            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: "CREATE_PAYMENT",
                    entity: "PAGO",
                    entityId: pago.id as string,
                    details: JSON.stringify({
                        monto: data.monto,
                        proyectoId: data.proyectoId,
                        metodo: data.metodo,
                        tipo: "PROJECT_ACTIVATION"
                    })
                }
            });
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── ADMIN ACTIONS (With Side-Effects & Audit) ───

export async function updatePaymentStatusAdmin(pagoId: string, status: "APROBADO" | "RECHAZADO") {
    try {
        const idP = idSchema.safeParse(pagoId);
        if (!idP.success) return { success: false, error: "ID de pago inválido" };

        const admin = await requireRole("ADMIN");

        const result = await prisma.$transaction(async (tx) => {
            const pago = await tx.pago.findUnique({
                where: { id: pagoId },
                include: { usuario: true }
            });

            if (!pago) throw new Error("Pago no encontrado");
            if (pago.estado !== "PENDIENTE") throw new Error("Este pago ya ha sido procesado");

            // 1. Update Payment Status
            const updatedPago = await tx.pago.update({
                where: { id: pagoId },
                data: { estado: status }
            });

            // 2. Handle Side-Effects
            // NOTE: Wallet balance manipulation REMOVED. No gateway = no money movement.
            // Only project status changes remain as they are tracking-based.
            const tipo = (pago as any).tipo;

            if (tipo === "PROJECT_ACTIVATION" && status === "APROBADO" && pago.proyectoId) {
                await tx.proyecto.update({
                    where: { id: pago.proyectoId },
                    data: { estado: "PUBLICADO" }
                });
            }

            // 3. Audit Log
            await createAuditLog(admin.id, `UPDATE_PAYMENT_${status}`, "Pago", pagoId, {
                tipo,
                usuarioId: pago.usuarioId,
                monto: pago.monto,
                oldStatus: "PENDIENTE",
                newStatus: status
            });

            return updatedPago;
        });

        revalidatePath("/dashboard/admin/pagos");
        if (result.proyectoId) revalidatePath(`/dashboard/proyectos/${result.proyectoId}`);

        return { success: true };
    } catch (error: any) {
        if (error.message === "Pago no encontrado" || error.message === "Este pago ya ha sido procesado") {
            return { success: false, error: error.message };
        }
        return handleGuardError(error);
    }
}

export async function getAllPayments(
    page: number = 1,
    limit: number = 10,
    status?: string
) {
    try {
        await requireRole("ADMIN");
        const where: any = {};
        if (status && status !== "ALL") where.estado = status;

        const [pagos, total] = await Promise.all([
            prisma.pago.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    usuario: { select: { nombre: true, email: true } },
                    proyecto: { select: { nombre: true } },
                }
            }),
            prisma.pago.count({ where })
        ]);

        return {
            success: true,
            data: {
                pagos,
                metadata: {
                    total,
                    page,
                    totalPages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function gestionarRetiro(pagoId: string, action: "APROBADO" | "RECHAZADO") {
    return updatePaymentStatusAdmin(pagoId, action);
}

export async function verifyPayment(pagoId: string) {
    return updatePaymentStatusAdmin(pagoId, "APROBADO");
}
