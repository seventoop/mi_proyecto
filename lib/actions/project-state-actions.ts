"use server";

/**
 * lib/actions/project-state-actions.ts
 *
 * Server Actions for EstadoValidacionProyecto state machine transitions:
 * admin transitions and owner submission flow.
 */

import { revalidatePath } from "next/cache";
import { requireAuth, requireAnyRole, handleGuardError } from "@/lib/guards";
import { getProjectAccess, assertPermission, ProjectPermission, transitionProyectoState } from "@/lib/project-access";
import { overrideFlags } from "@/lib/project-access/sync-flags";
import { audit } from "@/lib/actions/audit";
import { createNotification } from "@/lib/actions/notifications";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import prisma from "@/lib/db";
import type { EstadoValidacionProyecto } from "@/lib/project-access";

// ─── Notification helpers ─────────────────────────────────────────────────────

/**
 * Returns the user IDs of all ADMIN/SUPERADMIN users in the system.
 */
async function getAdminUserIds(): Promise<string[]> {
    const admins = await prisma.user.findMany({
        where: { rol: { in: ["ADMIN", "SUPERADMIN"] } },
        select: { id: true },
    });
    return admins.map(a => a.id);
}

/**
 * Returns the owner user ID for a project:
 * first looks for an explicit OWNER ProyectoUsuario row, falls back to creadoPorId.
 */
async function getProyectoOwnerId(proyectoId: string): Promise<string | null> {
    const ownerRelacion = await prisma.proyectoUsuario.findFirst({
        where: { proyectoId, tipoRelacion: "OWNER", estadoRelacion: "ACTIVA" },
        select: { userId: true },
    });
    if (ownerRelacion) return ownerRelacion.userId;

    const proyecto = await prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: { creadoPorId: true },
    });
    return proyecto?.creadoPorId ?? null;
}

/**
 * Returns user IDs of all active VENDEDOR_ASIGNADO relations on a project.
 */
async function getActiveVendedorIds(proyectoId: string): Promise<string[]> {
    const rows = await prisma.proyectoUsuario.findMany({
        where: { proyectoId, tipoRelacion: "VENDEDOR_ASIGNADO", estadoRelacion: "ACTIVA" },
        select: { userId: true },
    });
    return rows.map(r => r.userId);
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const transitionSchema = z.object({
    proyectoId:       idSchema,
    toEstado:         z.enum([
        "BORRADOR", "PENDIENTE_VALIDACION", "EN_REVISION",
        "APROBADO", "OBSERVADO", "RECHAZADO", "SUSPENDIDO",
    ]),
    nota:             z.string().max(1000).optional(),
    preserveOverride: z.boolean().optional(),
});

// ─── adminTransitionProyectoState ─────────────────────────────────────────────

/**
 * Admin-only: transition a project's estadoValidacion through the state machine.
 * Atomically syncs operational flags and writes ProyectoEstadoLog + AuditLog.
 */
export async function adminTransitionProyectoState(input: unknown) {
    try {
        const admin = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const parsed = transitionSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { proyectoId, toEstado, nota, preserveOverride } = parsed.data;

        const result = await transitionProyectoState(
            proyectoId,
            admin.id,
            "ADMIN",
            toEstado as EstadoValidacionProyecto,
            { nota, preserveOverride },
        );

        await audit({
            userId: admin.id,
            action: "PROJECT_STATE_TRANSITIONED",
            entity: "Proyecto",
            entityId: proyectoId,
            details: {
                estadoAnterior: result.estadoAnterior,
                estadoNuevo:    result.estadoNuevo,
                flagsSync:      result.flagsSync,
                nota:           nota ?? null,
            },
        });

        // ── 1a: Notify owner (and vendors for SUSPENDIDO) ──
        const proyectoRow = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { nombre: true },
        });
        const proyectoNombre = proyectoRow?.nombre ?? proyectoId;
        const ownerLink = `/dashboard/developer/proyectos/${proyectoId}`;
        const ownerId = await getProyectoOwnerId(proyectoId);

        if (ownerId) {
            if (toEstado === "OBSERVADO") {
                await createNotification(
                    ownerId,
                    "ALERTA",
                    `Proyecto con observaciones: ${proyectoNombre}`,
                    `Tu proyecto tiene observaciones. Motivo: ${nota || "Sin motivo especificado"}. Revisá y volvé a enviarlo.`,
                    ownerLink,
                );
            } else if (toEstado === "RECHAZADO") {
                await createNotification(
                    ownerId,
                    "ERROR",
                    `Proyecto rechazado: ${proyectoNombre}`,
                    `Tu proyecto fue rechazado. Motivo: ${nota || "Sin motivo especificado"}.`,
                    ownerLink,
                );
            } else if (toEstado === "APROBADO") {
                await createNotification(
                    ownerId,
                    "EXITO",
                    `Proyecto aprobado: ${proyectoNombre}`,
                    `¡Tu proyecto fue aprobado y está habilitado para operar comercialmente!`,
                    ownerLink,
                );
            } else if (toEstado === "SUSPENDIDO") {
                await createNotification(
                    ownerId,
                    "ALERTA",
                    `Proyecto suspendido: ${proyectoNombre}`,
                    `Tu proyecto fue suspendido por un administrador. Motivo: ${nota || "Sin motivo especificado"}. Contactá soporte para más información.`,
                    ownerLink,
                );
                // Also notify all active vendors
                const vendedorIds = await getActiveVendedorIds(proyectoId);
                await Promise.all(
                    vendedorIds.map(vid =>
                        createNotification(
                            vid,
                            "ALERTA",
                            `Proyecto suspendido: ${proyectoNombre}`,
                            `El proyecto ${proyectoNombre} fue suspendido temporalmente. Las operaciones comerciales están pausadas.`,
                            ownerLink,
                        )
                    )
                );
            }
        }

        revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── submitProyectoParaValidacion ─────────────────────────────────────────────

/**
 * OWNER action: submit project for validation.
 * Valid from: BORRADOR → PENDIENTE_VALIDACION
 *             OBSERVADO → PENDIENTE_VALIDACION (re-submit after observations)
 */
export async function submitProyectoParaValidacion(proyectoId: string, nota?: string) {
    try {
        const user = await requireAuth();

        const ctx = await getProjectAccess(user, proyectoId);
        assertPermission(ctx, ProjectPermission.EDITAR_PROYECTO);

        const estado = ctx.proyecto.estadoValidacion;
        if (estado !== "BORRADOR" && estado !== "OBSERVADO") {
            return {
                success: false,
                error: `El proyecto no puede enviarse a validación desde el estado ${estado}`,
            };
        }

        const result = await transitionProyectoState(
            proyectoId,
            user.id,
            "OWNER",
            "PENDIENTE_VALIDACION",
            { nota: nota ?? "Enviado a validación por el propietario" },
        );

        await audit({
            userId: user.id,
            action: "PROJECT_SUBMITTED_FOR_VALIDATION",
            entity: "Proyecto",
            entityId: proyectoId,
            details: { estadoAnterior: result.estadoAnterior },
        });

        // ── 1a: Notify all admins of new submission ──
        const proyectoRow = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { nombre: true },
        });
        const proyectoNombre = proyectoRow?.nombre ?? proyectoId;
        const adminIds = await getAdminUserIds();
        await Promise.all(
            adminIds.map(aid =>
                createNotification(
                    aid,
                    "INFO",
                    `Nuevo proyecto para validar: ${proyectoNombre}`,
                    `El proyecto "${proyectoNombre}" fue enviado a validación${nota ? `. Nota: ${nota}` : ""}.`,
                    `/dashboard/admin/proyectos/${proyectoId}`,
                )
            )
        );

        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── adminOverrideFlagsAction ──────────────────────────────────────────────────

const overrideFlagsSchema = z.object({
    proyectoId:       idSchema,
    motivo:           z.string().min(1, "El motivo es obligatorio").max(500),
    puedePublicarse:  z.boolean().optional(),
    puedeReservarse:  z.boolean().optional(),
    puedeCaptarLeads: z.boolean().optional(),
});

/**
 * Admin-only: manually override operational flags on a project,
 * bypassing the estadoValidacion-driven sync.
 * Blocked if project is in a BLOCKING_STATE (RECHAZADO, SUSPENDIDO).
 * Requires an explicit motivo — written to AuditLog.
 */
export async function adminOverrideFlagsAction(input: unknown) {
    try {
        const admin = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const parsed = overrideFlagsSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { proyectoId, motivo, puedePublicarse, puedeReservarse, puedeCaptarLeads } = parsed.data;

        await overrideFlags(proyectoId, admin.id, {
            ...(puedePublicarse  !== undefined && { puedePublicarse }),
            ...(puedeReservarse  !== undefined && { puedeReservarse }),
            ...(puedeCaptarLeads !== undefined && { puedeCaptarLeads }),
        });

        await audit({
            userId:   admin.id,
            action:   "ADMIN_FLAGS_OVERRIDE",
            entity:   "Proyecto",
            entityId: proyectoId,
            details:  {
                motivo,
                flags: { puedePublicarse, puedeReservarse, puedeCaptarLeads },
            },
        });

        revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
