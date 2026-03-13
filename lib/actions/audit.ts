"use server";

import prisma from "@/lib/db";
import { headers } from "next/headers";

/**
 * Writes a structured audit log entry.
 * NEVER throws — audit logging must never break the main operation flow.
 *
 * Usage:
 *   await audit({ userId: user.id, action: "RESERVA_APPROVED", entity: "Reserva", entityId: reservaId, details: { estado: "ACTIVA" } });
 *
 * Conventions:
 *   action — UPPER_SNAKE: <ENTITY>_<VERB>  e.g. LEAD_UPDATED, RESERVA_CANCELLED, KYC_APPROVED
 *   entity — PascalCase model name: Lead, Reserva, User, Proyecto, Workflow
 *   details — arbitrary JSON with before/after state or relevant fields
 */
export async function audit(params: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, unknown>;
}): Promise<void> {
    try {
        let ip: string | null = null;
        try {
            const h = headers();
            ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
        } catch {
            // headers() may not be available in all server contexts (e.g. cron jobs)
        }

        await prisma.auditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entity: params.entity,
                entityId: params.entityId ?? null,
                details: params.details ? JSON.stringify(params.details) : null,
                ip,
            },
        });
    } catch (e) {
        // Audit logging must never break the main operation flow
        console.error("[AUDIT] Failed to write audit log:", e);
    }
}
