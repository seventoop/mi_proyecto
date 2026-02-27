"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getWalletData(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { saldo: true }
        });

        const transacciones = await prisma.pago.findMany({
            where: { usuarioId: userId },
            orderBy: { fechaPago: "desc" },
            take: 10
        });

        return {
            success: true,
            saldo: user?.saldo || 0,
            transacciones
        };
    } catch (error) {
        return { success: false, error: "Error al obtener datos de la billetera" };
    }
}

export async function depositFunds(userId: string, monto: number, concepto: string = "Carga de Saldo") {
    try {
        // En una app real, aquí validaríamos con el gateway de pagos (Stripe, etc)

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { saldo: { increment: monto } }
            }),
            prisma.pago.create({
                data: {
                    usuarioId: userId,
                    monto,
                    moneda: "USD",
                    concepto,
                    estado: "APROBADO",
                    comprobanteUrl: "SIMULATED_PAYMENT"
                }
            })
        ]);

        revalidatePath("/dashboard/inversor/wallet");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al depositar fondos" };
    }
}

export async function withdrawFunds(userId: string, monto: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { saldo: true }
        });

        if (!user || user.saldo < monto) {
            return { success: false, error: "Saldo insuficiente" };
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { saldo: { decrement: monto } }
            }),
            prisma.pago.create({
                data: {
                    usuarioId: userId,
                    monto: -monto,
                    moneda: "USD",
                    concepto: "Retiro de Fondos",
                    estado: "PENDIENTE",
                }
            })
        ]);

        revalidatePath("/dashboard/inversor/wallet");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Error al procesar retiro" };
    }
}
