"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, error: "Usuario no autenticado" };
        }

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
                inversorId: userId,
                m2Comprados: data.m2Comprados,
                montoTotal: data.montoTotal,
                estado: "PENDIENTE",
                fechaInversion: new Date(),
                precioM2Aplicado: proyecto.precioM2Inversor || 0,
            }
        });

        // LogicToop Integration: INVESTOR_INTERESTED trigger
        if (proyecto?.orgId) {
            const { dispatchTrigger } = await import("@/lib/logictoop/dispatcher");
            dispatchTrigger("INVESTOR_INTERESTED", { 
                inversionId: inversion.id, 
                proyectoId: data.proyectoId, 
                m2: data.m2Comprados, 
                monto: data.montoTotal,
                userId: userId
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

        const session = await getServerSession(authOptions);
        const role = session?.user?.role;

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
                    m2VendidosInversores: { increment: inversion.m2Comprados as any }
                }
            });

            return { inversion, proyecto };
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
        console.error("Error confirming inversion:", error);
        return { success: false, error: "Error al confirmar inversión" };
    }
}

// ─── Queries ───

export async function getInversionesPorProyecto(proyectoId: string) {
    try {
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

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
        const userId = session?.user?.id;

        if (!userId) return { success: false, error: "No autorizado" };

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
