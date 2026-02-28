"use server";

/**
 * ══════════════════════════════════════════════════════════
 * WALLET MODULE — DISABLED (No Payment Gateway Configured)
 * ══════════════════════════════════════════════════════════
 *
 * This module is intentionally disabled because:
 * 1. No payment gateway (Stripe, MercadoPago, etc.) is integrated.
 * 2. Simulating deposits/withdrawals without real money movement
 *    is dangerous and potentially illegal.
 * 3. Balance manipulation without a gateway creates false financial records.
 *
 * WHEN A GATEWAY IS INTEGRATED:
 * - depositFunds → create Checkout Session via gateway → webhook confirms → increment balance
 * - withdrawFunds → create Payout via gateway → webhook confirms → decrement balance
 * - All mutations must go through gateway webhooks (never direct balance manipulation)
 *
 * For now, getWalletData returns read-only data for informational purposes.
 */

import prisma from "@/lib/db";
import { requireAuth, handleGuardError } from "@/lib/guards";

// ─── Queries (Read-Only) ───

export async function getWalletData() {
    try {
        const user = await requireAuth();

        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { saldo: true },
        });

        const transacciones = await prisma.pago.findMany({
            where: { usuarioId: user.id },
            orderBy: { fechaPago: "desc" },
            take: 15,
        });

        return {
            success: true,
            saldo: Number(userData?.saldo || 0),
            transacciones: transacciones.map(t => ({
                ...t,
                monto: Number(t.monto),
            })),
            gatewayEnabled: false,
            message: "Módulo de pagos en configuración. Los depósitos y retiros estarán disponibles cuando se integre la pasarela de pago.",
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── Mutations (DISABLED) ───

export async function depositFunds(_input: unknown) {
    return {
        success: false,
        error: "Función deshabilitada. No hay pasarela de pago configurada. Los depósitos estarán disponibles próximamente.",
    };
}

export async function withdrawFunds(_input: unknown) {
    return {
        success: false,
        error: "Función deshabilitada. No hay pasarela de pago configurada. Los retiros estarán disponibles próximamente.",
    };
}
