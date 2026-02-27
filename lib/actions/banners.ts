"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getBanners(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
} = {}) {
    const { page = 1, pageSize = 20, status, userId } = params;
    const skip = (page - 1) * pageSize;

    try {
        const where: any = {};
        if (status) where.estado = status;
        if (userId) where.creadoPorId = userId;

        const [banners, total] = await Promise.all([
            prisma.banner.findMany({
                where,
                select: {
                    id: true,
                    titulo: true,
                    mediaUrl: true,
                    linkDestino: true,
                    posicion: true,
                    prioridad: true,
                    estado: true,
                    tipo: true,
                    createdAt: true,
                    pago: {
                        select: {
                            id: true,
                            monto: true,
                            estado: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: pageSize,
                skip
            }),
            prisma.banner.count({ where })
        ]);

        return {
            success: true,
            data: banners,
            metadata: {
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error("Error fetching banners:", error);
        return { success: false, error: "Error al obtener banners" };
    }
}

export async function createBanner(data: {
    titulo: string;
    mediaUrl: string;
    linkDestino?: string;
    posicion: string;
    prioridad: number;
    fechaInicio?: Date;
    fechaFin?: Date;
    tipo: string;
    creadoPorId?: string; // Nuevo campo opcional
}) {
    try {
        const banner = await prisma.banner.create({
            data: {
                ...data,
                estado: data.creadoPorId ? "PENDIENTE_PAGO" : "PENDIENTE", // Devs start as PENDIENTE_PAGO
            },
        });
        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return { success: false, error: "Error al crear banner" };
    }
}

export async function linkBannerPayment(bannerId: string, comprobanteUrl: string, monto: number) {
    try {
        // Create payment record
        const banner = await prisma.banner.findUnique({ where: { id: bannerId } });
        if (!banner || !banner.creadoPorId) throw new Error("Banner no válido");

        await prisma.pago.create({
            data: {
                monto,
                concepto: `Pago por Banner: ${banner.titulo}`,
                comprobanteUrl,
                usuarioId: banner.creadoPorId,
                bannerId: banner.id,
                estado: "PENDIENTE"
            }
        });

        // Update banner status
        await prisma.banner.update({
            where: { id: bannerId },
            data: { estado: "PENDIENTE" } // Moves to Admin Review
        });

        revalidatePath("/dashboard/developer/banners");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al registrar pago" };
    }
}

import { createNotification } from "./notifications";

export async function updateBanner(id: string, data: any) {
    try {
        // Get old status to check for changes
        const oldBanner = await prisma.banner.findUnique({ where: { id } });

        const banner = await prisma.banner.update({
            where: { id },
            data,
        });

        // Notify user if status changed
        if (oldBanner && oldBanner.estado !== banner.estado && banner.creadoPorId) {
            let titulo = "Actualización de Anuncio";
            let mensaje = `El estado de su anuncio "${banner.titulo}" ha cambiado a ${banner.estado}.`;
            let tipo: 'INFO' | 'ALERTA' | 'EXITO' | 'ERROR' = 'INFO';

            if (banner.estado === "APROBADO") {
                titulo = "¡Anuncio Aprobado! 🚀";
                mensaje = `Su anuncio "${banner.titulo}" ha sido aprobado y ya es visible en la plataforma.`;
                tipo = 'EXITO';
            } else if (banner.estado === "RECHAZADO") {
                titulo = "Anuncio Rechazado ❌";
                mensaje = `Su anuncio "${banner.titulo}" ha sido rechazado. Por favor contacte a soporte o revise las políticas.`;
                tipo = 'ERROR';
            }

            await createNotification(banner.creadoPorId, tipo, titulo, mensaje, "/dashboard/developer/banners");
        }

        revalidatePath("/dashboard/banners");
        return { success: true, data: banner };
    } catch (error) {
        return { success: false, error: "Error al actualizar banner" };
    }
}

export async function deleteBanner(id: string) {
    try {
        await prisma.banner.delete({ where: { id } });
        revalidatePath("/dashboard/banners");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al eliminar banner" };
    }
}
