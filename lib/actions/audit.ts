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
 * CANONICAL ACTIONS (UPPER_SNAKE):
 *   - PROJECT_CREATE, PROJECT_UPDATE, PROJECT_DELETE
 *   - UNIT_CREATE, UNIT_UPDATE, UNIT_DELETE, UNIT_STATUS_CHANGED
 *   - RESERVA_CREATED, RESERVA_APPROVED, RESERVA_CANCELLED
 *   - LEAD_CREATED, LEAD_ASSIGNED, LEAD_STATUS_CHANGED
 *   - KYC_SUBMITTED, KYC_APPROVED, KYC_REJECTED
 *   - AUTH_RESET_PASSWORD
 *   - TENANT_RESOLUTION_FAILED
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
        let userAgent: string | null = null;
        try {
            const h = await headers();
            ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
            userAgent = h.get("user-agent") || null;
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
                userAgent,
            },
        });
    } catch (e) {
        // Audit logging must never break the main operation flow
        console.error("[AUDIT] Failed to write audit log:", e);
    }
}
