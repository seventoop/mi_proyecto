"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// --- CUENTAS BANCARIAS (PENDIENTE DE IMPLEMENTACIÓN EN SCHEMA) ---

/*
export async function addCuentaBancaria(data: {
    proyectoId: string;
    banco: string;
    titular: string;
    cbu: string;
    alias?: string;
    tipo: string;
}) {
   // ... implementation commented out
    return { success: false, error: "Función no implementada" };
}

export async function deleteCuentaBancaria(id: string) {
    // ... implementation commented out
    return { success: false, error: "Función no implementada" };
}
*/

// --- SOLICITUDES DE RETIRO ---

export async function solicitarRetiro(data: {
    proyectoId: string;
    cuentaId: string;
    monto: number;
    concepto: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        // Validar saldo disponible (simplificado: chequea m2 vendidos vs retirado)
        const proyecto = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            include: { pagos: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY CHECK: Only Owner or Admin can request withdrawal
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }

        const totalRecaudado = (proyecto.m2VendidosInversores || 0) * (proyecto.precioM2Inversor || 0);
        const totalRetirado = proyecto.pagos
            .filter(p => p.estado === "APROBADO")
            .reduce((acc, p) => acc + p.monto, 0);

        const saldoDisponible = totalRecaudado - totalRetirado;

        if (data.monto > saldoDisponible) {
            return { success: false, error: `Saldo insuficiente. Disponible: $${saldoDisponible}` };
        }

        /*
        const retiro = await prisma.pago.create({
            data: {
                proyectoId: data.proyectoId,
                // cuentaId: data.cuentaId, // ERROR: No existe en schema
                monto: data.monto,
                concepto: data.concepto,
                estado: "PENDIENTE", // PENDIENTE -> APROBADO -> RECHAZADO
                // fechaSolicitud: new Date() // ERROR: No existe en schema
            }
        });
        */

        // revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        // return { success: true, data: retiro };
        return { success: false, error: "Función de retiro pendiente de actualización de esquema" };

    } catch (error) {
        console.error("Error requesting withdrawal:", error);
        return { success: false, error: "Error al solicitar retiro" };
    }
}

export async function gestionarRetiro(id: string, estado: "APROBADO" | "RECHAZADO", comentario?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        /*
        const retiro = await prisma.pago.update({
            where: { id },
            data: {
                estado,
                // comentarioAdmin: comentario, // ERROR: No existe en schema
                // fechaAprobacion: estado === "APROBADO" ? new Date() : null // ERROR: No existe en schema
            },
            include: { proyecto: true }
        });

        revalidatePath(`/dashboard/proyectos/${retiro.proyectoId}`);
        return { success: true, data: retiro };
        */
        return { success: false, error: "Función no implementada" };
    } catch (error) {
        console.error("Error managing withdrawal:", error);
        return { success: false, error: "Error al gestionar retiro" };
    }
}

export async function getPagosProyecto(proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        const proyecto = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { creadoPorId: true }
        });

        if (!proyecto) return { success: false, error: "Proyecto no encontrado" };

        // SECURITY: Only Admin or Owner
        if (user.role !== "ADMIN" && proyecto.creadoPorId !== user.id) {
            return { success: false, error: "No autorizado" };
        }
        const pagos = await prisma.pago.findMany({
            where: { proyectoId },
            // include: { cuenta: true }, // ERROR: No existe
            orderBy: { createdAt: "desc" }
        });

        // const cuentas = await prisma.cuentaBancaria.findMany({ ... }); // ERROR: No existe

        return { success: true, pagos, cuentas: [] };
    } catch (error) {
        console.error("Error getting payments:", error);
        return { success: false, error: "Error al obtener pagos" };
    }
}

// --- PAGOS DE ACTIVACIÓN / RECEPCIÓN ---

export async function createPayment(data: {
    proyectoId: string;
    usuarioId: string;
    monto: number;
    comprobanteUrl: string;
    metodo: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user;
        if (!user) return { success: false, error: "No autorizado" };

        // A user can only create a payment for themselves or they must be an Admin
        if (user.role !== "ADMIN" && user.id !== data.usuarioId) {
            // Also allow if they are the owner of the project (paying for activation)
            const proyecto = await prisma.proyecto.findUnique({ where: { id: data.proyectoId }, select: { creadoPorId: true } });
            if (proyecto?.creadoPorId !== user.id) {
                return { success: false, error: "No autorizado" };
            }
        }
        await prisma.$transaction(async (tx) => {
            await tx.pago.create({
                data: {
                    proyectoId: data.proyectoId,
                    usuarioId: data.usuarioId,
                    monto: data.monto,
                    moneda: "USD",
                    comprobanteUrl: data.comprobanteUrl,
                    estado: "PENDIENTE",
                    concepto: `Activación de Proyecto - Método: ${data.metodo}`,
                    fechaPago: new Date()
                }
            });

            // Update project status
            await tx.proyecto.update({
                where: { id: data.proyectoId },
                data: { estado: "PENDIENTE_PAGO" }
            });
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error creating payment:", error);
        return { success: false, error: "Error al registrar pago" };
    }
}

export async function verifyPayment(pagoId: string, status: "APROBADO" | "RECHAZADO", proyectoId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        await prisma.$transaction(async (tx) => {
            await tx.pago.update({
                where: { id: pagoId },
                data: {
                    estado: status

                }
            });

            if (status === "APROBADO") {
                await tx.proyecto.update({
                    where: { id: proyectoId },
                    data: { estado: "PUBLICADO" }
                });
            }
        });

        revalidatePath(`/dashboard/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        console.error("Error verifying payment:", error);
        return { success: false, error: "Error al verificar pago" };
    }
}

// --- ADMIN ACTIONS ---

export async function getAllPayments(
    page: number = 1,
    limit: number = 10,
    status?: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
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
                    banner: { select: { titulo: true } }
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
        console.error("Error fetching all payments:", error);
        return { success: false, error: "Error al obtener pagos" };
    }
}

export async function updatePaymentStatusAdmin(pagoId: string, status: "APROBADO" | "RECHAZADO") {
    try {
        const session = await getServerSession(authOptions);
        if (session?.user?.role !== "ADMIN") return { success: false, error: "No autorizado" };
        await prisma.pago.update({
            where: { id: pagoId },
            data: { estado: status }
        });
        revalidatePath("/dashboard/admin/pagos");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al actualizar pago" };
    }
}
