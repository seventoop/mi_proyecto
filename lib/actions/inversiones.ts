"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function crearInversion(data: {
    proyectoId: string;
    m2Comprados: number;
    montoTotal: number;
    metodoPago: string;
    comprobanteUrl?: string;
}) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return { success: false, error: "Usuario no autenticado" };
        }

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
                precioM2Inversor: true
            }
        });

        if (!proyecto || !proyecto.invertible) {
            return { success: false, error: "El proyecto no admite inversiones" };
        }

        // Validar límite
        const nuevoTotal = (proyecto.m2VendidosInversores || 0) + data.m2Comprados;
        if (nuevoTotal > (proyecto.metaM2Objetivo || 0)) {
            return { success: false, error: "La inversión excede la meta del proyecto" };
        }

        // Crear inversión en estado PENDIENTE (o ESCROW si es confirmado)
        const inversion = await prisma.inversion.create({
            data: {
                proyectoId: data.proyectoId,
                inversorId: userId,
                m2Comprados: data.m2Comprados,
                montoTotal: data.montoTotal,
                estado: "PENDIENTE", // PENDIENTE -> PAGADO -> EN_ESCROW -> COMPLETADO
                fechaInversion: new Date(),
                precioM2Aplicado: proyecto.precioM2Inversor || 0,
                // comprobante: data.comprobanteUrl // TODO: Field does not exist in schema
            }
        });

        revalidatePath(`/dashboard/proyectos/${data.proyectoId}`);
        revalidatePath("/dashboard/inversor/mis-inversiones");

        return { success: true, data: inversion };
    } catch (error) {
        console.error("Error creating inversion:", error);
        return { success: false, error: "Error al registrar inversión" };
    }
}

export async function confirmarInversion(id: string) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;

        if (role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        // Iniciar transacción: Actualizar estado y sumar m2 al proyecto
        const result = await prisma.$transaction(async (tx) => {
            const inversion = await tx.inversion.update({
                where: { id },
                data: { estado: "EN_ESCROW" }
            });

            const proyecto = await tx.proyecto.update({
                where: { id: inversion.proyectoId },
                data: {
                    m2VendidosInversores: { increment: inversion.m2Comprados }
                }
            });

            // Aquí se podría generar notificación al inversor

            return { inversion, proyecto };
        });

        revalidatePath(`/dashboard/proyectos/${result.inversion.proyectoId}`);
        return { success: true, data: result.inversion };
    } catch (error) {
        console.error("Error confirming inversion:", error);
        return { success: false, error: "Error al confirmar inversión" };
    }
}

export async function getInversionesPorProyecto(proyectoId: string) {
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
        console.error("Error fetching project investments:", error);
        return { success: false, error: "Error al obtener inversiones" };
    }
}

export async function getMisInversiones() {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id;

        if (!userId) return { success: false, error: "No autorizado" };

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { kycStatus: true, riskLevel: true } as any
        });

        const inversiones = await prisma.inversion.findMany({
            where: { inversorId: userId },
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
        console.error("Error fetching my investments:", error);
        return { success: false, error: "Error al obtener mis inversiones" };
    }
}
