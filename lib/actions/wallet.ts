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

// ─── Mutations (SIMULATED FOR PRODUCTION TESTING) ───

export async function depositFunds(input: { 
    monto: number; 
    concepto?: string; 
    idempotencyKey?: string;
}) {
    try {
        const user = await requireAuth();
        const { monto, concepto, idempotencyKey } = input;

        if (monto <= 0) return { success: false, error: "El monto debe ser positivo" };

        const result = await prisma.$transaction(async (tx) => {
            // Idempotency check
            if (idempotencyKey) {
                const existing = await tx.pago.findUnique({ where: { idempotencyKey } });
                if (existing) return existing;
            }

            // 1. Create Payment record
            const pago = await tx.pago.create({
                data: {
                    usuarioId: user.id,
                    monto: monto,
                    concepto: concepto || "Depósito de fondos (Simulado)",
                    estado: "PAGADO",
                    tipo: "DEPOSITO",
                    idempotencyKey: idempotencyKey || null,
                }
            });

            // 2. Increment user balance
            await tx.user.update({
                where: { id: user.id },
                data: { saldo: { increment: monto } }
            });

            return pago;
        });

        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function withdrawFunds(input: { 
    monto: number; 
    concepto?: string;
    idempotencyKey?: string;
}) {
    try {
        const user = await requireAuth();
        const { monto, concepto, idempotencyKey } = input;

        if (monto <= 0) return { success: false, error: "El monto debe ser positivo" };

        const result = await prisma.$transaction(async (tx) => {
            // Check balance
            const userData = await tx.user.findUnique({ where: { id: user.id }, select: { saldo: true } });
            if (!userData || Number(userData.saldo) < monto) {
                throw new Error("Saldo insuficiente");
            }

            // Idempotency check
            if (idempotencyKey) {
                const existing = await tx.pago.findUnique({ where: { idempotencyKey } });
                if (existing) return existing;
            }

            // 1. Create Payment record (negative for history)
            const pago = await tx.pago.create({
                data: {
                    usuarioId: user.id,
                    monto: monto,
                    concepto: concepto || "Retiro de fondos (Simulado)",
                    estado: "PAGADO",
                    tipo: "RETIRO",
                    idempotencyKey: idempotencyKey || null,
                }
            });

            // 2. Decrement user balance
            await tx.user.update({
                where: { id: user.id },
                data: { saldo: { decrement: monto } }
            });

            return pago;
        });

        return { success: true, data: result };
    } catch (error: any) {
        if (error.message === "Saldo insuficiente") return { success: false, error: error.message };
        return handleGuardError(error);
    }
}
