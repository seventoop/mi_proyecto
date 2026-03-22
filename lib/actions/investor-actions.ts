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

        const totalM2 = (inversiones as any[]).reduce((acc: number, inv: any) => acc + Number(inv.m2Comprados), 0);
        const totalInvertido = (inversiones as any[]).reduce((acc: number, inv: any) => acc + Number(inv.montoTotal), 0);

        // Calculate current portfolio value
        const valorActual = (inversiones as any[]).reduce((acc: number, inv: any) => {
            const marketPrice = Number(inv.proyecto.precioM2Mercado || inv.precioM2Aplicado);
            return acc + (Number(inv.m2Comprados) * marketPrice);
        }, 0);

        const gananciaProyectada = valorActual - totalInvertido;
        const roiPromedio = totalInvertido > 0 ? (gananciaProyectada / totalInvertido) * 100 : 0;

        // Project Distribution
        const distribution = inversiones.reduce((acc: any[], inv) => {
            const existing = acc.find(item => item.proyectoId === inv.proyectoId);
            if (existing) {
                existing.monto += Number(inv.montoTotal);
            } else {
                acc.push({
                    proyectoId: inv.proyectoId,
                    nombre: inv.proyecto.nombre,
                    monto: Number(inv.montoTotal)
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
                monto: Number(inv.montoTotal),
                estado: inv.estado
            })),
            ...pagos.map(pago => ({
                id: pago.id,
                fecha: pago.fechaPago,
                tipo: "Pago",
                proyecto: (pago as any).proyecto?.nombre || "General",
                monto: Number(pago.monto),
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
                    proyectosActivosCount: inversiones.filter(i => i.estado === 'ACTIVO').length
                }
            }
        };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getInvestmentOpportunities() {
    try {
        const authUser = await requireAuth();
        const now = new Date();
        const [opportunities, favoritos] = await Promise.all([
            prisma.proyecto.findMany({
                where: {
                    invertible: true,
                    deletedAt: null,
                    visibilityStatus: { not: 'BORRADOR' },
                    estado: { notIn: ['VENDIDO', 'SUSPENDIDO', 'CANCELADO', 'ELIMINADO'] },
                    OR: [
                        { isDemo: false },
                        { AND: [{ isDemo: true }, { demoExpiresAt: { gt: now } }] }
                    ]
                },
                include: {
                    hitosEscrow: true
                },
                orderBy: { createdAt: "desc" }
            }),
            prisma.favoritoProyecto.findMany({
                where: { userId: authUser.id },
                select: { proyectoId: true }
            })
        ]);

        const favIds = new Set(favoritos.map(f => f.proyectoId));

        return opportunities.map(op => ({
            ...op,
            isFavorite: favIds.has(op.id)
        }));
    } catch (error) {
        console.error("[getInvestmentOpportunities]", error);
        return [];
    }
}

export async function getAllPublicProjects() {
    try {
        const authUser = await requireAuth();
        const now = new Date();
        const [proyectos, favoritos] = await Promise.all([
            prisma.proyecto.findMany({
                where: {
                    deletedAt: null,
                    visibilityStatus: { not: "BORRADOR" },
                    estado: { notIn: ["SUSPENDIDO", "CANCELADO", "ELIMINADO"] },
                    OR: [
                        { isDemo: false },
                        { AND: [{ isDemo: true }, { demoExpiresAt: { gt: now } }] },
                    ],
                },
                select: {
                    id: true, nombre: true, slug: true, ubicacion: true,
                    descripcion: true, imagenPortada: true, tipo: true, estado: true,
                    precioM2Inversor: true, precioM2Mercado: true,
                    metaM2Objetivo: true, m2VendidosInversores: true,
                    invertible: true, isDemo: true,
                    _count: { select: { etapas: true } },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.favoritoProyecto.findMany({
                where: { userId: authUser.id },
                select: { proyectoId: true },
            }),
        ]);
        const favIds = new Set(favoritos.map(f => f.proyectoId));
        return proyectos.map(p => ({ ...p, isFavorite: favIds.has(p.id) }));
    } catch (error) {
        console.error("[getAllPublicProjects]", error);
        return [];
    }
}

export async function toggleFavorito(proyectoId: string) {
    try {
        const authUser = await requireAuth();
        const idParsed = idSchema.safeParse(proyectoId);
        if (!idParsed.success) return { success: false, error: "ID de proyecto inválido" };

        const existing = await prisma.favoritoProyecto.findUnique({
            where: {
                userId_proyectoId: {
                    userId: authUser.id,
                    proyectoId
                }
            }
        });

        if (existing) {
            await prisma.favoritoProyecto.delete({
                where: { id: existing.id }
            });
            return { success: true, isFavorite: false };
        } else {
            await prisma.favoritoProyecto.create({
                data: {
                    userId: authUser.id,
                    proyectoId
                }
            });
            return { success: true, isFavorite: true };
        }
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getInversorFavoritos() {
    try {
        const authUser = await requireAuth();
        const favoritos = await prisma.favoritoProyecto.findMany({
            where: { userId: authUser.id },
            include: {
                proyecto: {
                    select: {
                        id: true,
                        nombre: true,
                        ubicacion: true,
                        descripcion: true,
                        imagenPortada: true,
                        precioM2Inversor: true,
                        precioM2Mercado: true,
                        metaM2Objetivo: true,
                        m2VendidosInversores: true,
                        fechaLimiteFondeo: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return {
            success: true,
            data: favoritos.map(f => ({
                ...f.proyecto,
                isFavorite: true
            }))
        };
    } catch (error) {
        return handleGuardError(error);
    }
}
