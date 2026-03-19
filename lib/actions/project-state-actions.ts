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
import { audit } from "@/lib/actions/audit";
import { z } from "zod";
import { idSchema } from "@/lib/validations";
import type { EstadoValidacionProyecto } from "@/lib/project-access";

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

        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true, data: result };
    } catch (error) {
        return handleGuardError(error);
    }
}
