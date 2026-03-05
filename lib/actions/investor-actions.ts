"use server";

import prisma from "@/lib/db";
import { requireAuth, handleGuardError } from "@/lib/guards";
import { idSchema } from "@/lib/validations";

export async function getInversorDashboardData(userId: string) {
    try {
        const idParsed = idSchema.safeParse(userId);
        if (!idParsed.success) return { success: false, error: "ID de usuario inválido" };

        const authUser = await requireAuth();
        if (authUser.id !== userId && authUser.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        const [inversiones, user, pagos] = await Promise.all([
            prisma.inversion.findMany({
                where: { inversorId: userId },
                include: { proyecto: true },
            }),
            prisma.user.findUnique({
                where: { id: userId },
                select: { saldo: true }
            }),
            prisma.pago.findMany({
                where: { usuarioId: userId },
                include: { proyecto: true },
                orderBy: { fechaPago: "desc" }
            })
        ]);

        const totalM2 = (inversiones as any[]).reduce((acc: number, inv: any) => acc + inv.m2Comprados, 0);
        const totalInvertido = (inversiones as any[]).reduce((acc: number, inv: any) => acc + inv.montoTotal, 0);

        // Calculate current portfolio value
        const valorActual = (inversiones as any[]).reduce((acc: number, inv: any) => {
            const marketPrice = inv.proyecto.precioM2Mercado || inv.precioM2Aplicado;
            return acc + (inv.m2Comprados * marketPrice);
        }, 0);

        const gananciaProyectada = valorActual - totalInvertido;
        const roiPromedio = totalInvertido > 0 ? (gananciaProyectada / totalInvertido) * 100 : 0;

        // Project Distribution
        const distribution = inversiones.reduce((acc: any[], inv) => {
            const existing = acc.find(item => item.proyectoId === inv.proyectoId);
            if (existing) {
                existing.monto += inv.montoTotal;
            } else {
                acc.push({
                    proyectoId: inv.proyectoId,
                    nombre: inv.proyecto.nombre,
                    monto: inv.montoTotal
                });
            }
            return acc;
        }, []);

        // Combine inversiones and pagos for movements history
        const movimientos = [
            ...inversiones.map(inv => ({
                id: inv.id,
                fecha: inv.fechaInversion,
                tipo: "Inversión",
                proyecto: inv.proyecto.nombre,
                monto: inv.montoTotal,
                estado: inv.estado
            })),
            ...pagos.map(pago => ({
                id: pago.id,
                fecha: pago.fechaPago,
                tipo: "Pago",
                proyecto: (pago as any).proyecto?.nombre || "General",
                monto: pago.monto,
                estado: pago.estado
            }))
        ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

        // Next financial milestone
        const nextMilestone = await prisma.escrowMilestone.findFirst({
            where: {
                proyectoId: { in: inversiones.map(inv => inv.proyectoId) },
                estado: "PENDIENTE" as any
            },
            include: { proyecto: true },
            orderBy: { createdAt: "asc" }
        });

        return {
            success: true,
            data: {
                inversiones,
                movimientos,
                nextMilestone,
                distribution,
                stats: {
                    totalM2,
                    totalInvertido,
                    valorActual,
                    gananciaProyectada,
                    roiPromedio: Math.round(roiPromedio * 10) / 10,
                    saldoDisponible: Number(user?.saldo ?? 0),
                }
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getInvestmentOpportunities() {
    try {
        const now = new Date();
        const opportunities = await prisma.proyecto.findMany({
            where: {
                invertible: true,
                estado: { notIn: ['VENDIDO', 'SUSPENDIDO'] },
                visibilityStatus: 'PUBLICADO',
                OR: [
                    { isDemo: false },
                    { AND: [{ isDemo: true }, { demoExpiresAt: { gt: now } }] }
                ]
            },
            include: {
                hitosEscrow: true
            },
            orderBy: { createdAt: "desc" }
        });

        return opportunities;
    } catch (error) {
        console.error("[getInvestmentOpportunities]", error);
        return [];
    }
}
