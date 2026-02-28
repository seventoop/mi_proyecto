import { Proyecto } from "@prisma/client";

/**
 * Investment Logic Engine - Seventoop
 * Handles calculations for m2 appreciation, ROI, and Escrow status.
 */

export interface ProjectionResult {
    montoInvertido: number;
    valorMercadoEstimado: number;
    gananciaProyectada: number;
    roiPorcentaje: number;
    apreciacionM2: number;
}

export function calculateInvestmentProjection(
    m2: number,
    precioCosto: number,
    precioMercado: number
): ProjectionResult {
    const montoInvertido = m2 * precioCosto;
    const valorMercadoEstimado = m2 * precioMercado;
    const gananciaProyectada = valorMercadoEstimado - montoInvertido;
    const roiPorcentaje = montoInvertido > 0 ? (gananciaProyectada / montoInvertido) * 100 : 0;
    const apreciacionM2 = precioMercado - precioCosto;

    return {
        montoInvertido,
        valorMercadoEstimado,
        gananciaProyectada,
        roiPorcentaje,
        apreciacionM2,
    };
}

export function getFundingProgress(proyecto: Proyecto) {
    const meta = Number(proyecto.metaM2Objetivo || 0);
    if (meta === 0) return 0;
    const vendidos = Number(proyecto.m2VendidosInversores);
    const progress = (vendidos / meta) * 100;
    return Math.min(100, Math.round(progress));
}

export function getEscrowStatusLabel(estado: string) {
    switch (estado) {
        case "PENDING": return "Pago Pendiente";
        case "ESCROW": return "Protegido en Escrow";
        case "RELEASED": return "Fondos Liberados";
        case "REFUNDED": return "Reembolsado";
        default: return estado;
    }
}
