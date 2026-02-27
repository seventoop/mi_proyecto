import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Proyecto, Inversion } from "@prisma/client";

export async function getInversorDashboardData(userId: string) {
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
            proyecto: pago.proyecto?.nombre || "General",
            monto: pago.monto,
            estado: pago.estado
        }))
    ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    // Next financial milestone
    const nextMilestone = await prisma.escrowMilestone.findFirst({
        where: {
            proyectoId: { in: inversiones.map(inv => inv.proyectoId) },
            estado: "PENDIENTE"
        },
        include: { proyecto: true },
        orderBy: { createdAt: "asc" }
    });

    return {
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
            saldoDisponible: user?.saldo || 0,
        }
    };
}

export async function getInvestmentOpportunities() {
    try {
        // Raw SQL to filter IDs bypassing outdated Prisma Client type check for isDemo/demoExpiresAt
        const filteredResults: any[] = await prisma.$queryRaw`
            SELECT id FROM proyectos 
            WHERE "invertible" = true 
            AND "estado" NOT IN ('VENDIDO', 'SUSPENDIDO')
            AND "visibilityStatus" = 'PUBLICADO'
            AND (
                "isDemo" = false 
                OR ("isDemo" = true AND "demoExpiresAt" > NOW())
            )
            ORDER BY "createdAt" DESC
        `;
        const ids = filteredResults.map(r => r.id);

        if (ids.length === 0) return [];

        const opportunities = await prisma.proyecto.findMany({
            where: { id: { in: ids } },
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
