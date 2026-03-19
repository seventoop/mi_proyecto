"use server";

/**
 * lib/actions/mandate-actions.ts
 *
 * Mandate lifecycle for COMERCIALIZADOR_* ProyectoUsuario relations:
 *   1. createComercializadorRelacion — OWNER creates relation as PENDIENTE
 *   2. approveMandate               — ADMIN approves → ACTIVA
 *   3. rejectMandate                — ADMIN rejects → RECHAZADA
 *
 * ADMIN can still use assignUserToProject for direct ACTIVA assignment when needed.
 * This module is the correct path for the approval-gated COMERCIALIZADOR flow.
 */

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth, requireAnyRole, handleGuardError } from "@/lib/guards";
import { getProjectAccess, assertPermission, ProjectPermission } from "@/lib/project-access";
import { audit } from "@/lib/actions/audit";
import { createNotification } from "@/lib/actions/notifications";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createComercializadorSchema = z.object({
    proyectoId:           idSchema,
    targetUserId:         idSchema,
    tipoRelacion:         z.enum(["COMERCIALIZADOR_EXCLUSIVO", "COMERCIALIZADOR_NO_EXCLUSIVO"]),
    tipoMandato:          z.enum(["EXCLUSIVO", "NO_EXCLUSIVO"]),
    mandatoVigenciaDesde: z.string().datetime({ message: "Fecha de inicio de mandato requerida" }),
    mandatoVigenciaHasta: z.string().datetime({ message: "Fecha de fin de mandato requerida" }),
    documentoMandatoUrl:  z.string().url("URL del documento requerida"),
    notas:                z.string().max(500).optional(),
});

const mandateActionSchema = z.object({
    proyectoId:    idSchema,
    targetUserId:  idSchema,
    motivo:        z.string().max(500).optional(),
});

// ─── createComercializadorRelacion ────────────────────────────────────────────

/**
 * OWNER action: propose a COMERCIALIZADOR_* relation for a project.
 * Creates the ProyectoUsuario row with estadoRelacion=PENDIENTE.
 * Requires admin approval via approveMandate before the user gains commercial access.
 */
export async function createComercializadorRelacion(input: unknown) {
    try {
        const user = await requireAuth();

        const parsed = createComercializadorSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const data = parsed.data;

        // OWNER-level permission required
        const ctx = await getProjectAccess(user, data.proyectoId);
        assertPermission(ctx, ProjectPermission.GESTIONAR_RELACIONES);

        // Target user must exist and belong to the same org
        const targetUser = await prisma.user.findUnique({
            where: { id: data.targetUserId },
            select: { id: true, nombre: true, orgId: true },
        });
        if (!targetUser) {
            return { success: false, error: "Usuario no encontrado" };
        }
        const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
        if (!isAdmin && targetUser.orgId !== user.orgId) {
            return { success: false, error: "El usuario debe pertenecer a la misma organización" };
        }

        // Validate mandate date range
        const desde = new Date(data.mandatoVigenciaDesde);
        const hasta = new Date(data.mandatoVigenciaHasta);
        if (hasta <= desde) {
            return { success: false, error: "La fecha de fin del mandato debe ser posterior a la de inicio" };
        }

        // Exclusivity conflict check: no active or pending exclusive mandate may overlap
        if (data.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO") {
            const conflict = await prisma.proyectoUsuario.findFirst({
                where: {
                    proyectoId:    data.proyectoId,
                    tipoRelacion:  "COMERCIALIZADOR_EXCLUSIVO",
                    estadoRelacion: { in: ["ACTIVA", "PENDIENTE"] },
                    NOT: { userId: data.targetUserId },
                },
                select: {
                    mandatoVigenciaDesde: true,
                    mandatoVigenciaHasta: true,
                    user: { select: { nombre: true } },
                },
            });
            if (conflict) {
                const cFrom = conflict.mandatoVigenciaDesde;
                const cTo   = conflict.mandatoVigenciaHasta;
                const overlaps =
                    !cFrom || !cTo
                        ? true
                        : desde < cTo && hasta > cFrom;
                if (overlaps) {
                    return {
                        success: false,
                        error: `Ya existe un comercializador exclusivo activo o pendiente (${conflict.user.nombre}) con vigencia superpuesta`,
                    };
                }
            }
        }

        // Default permissions for COMERCIALIZADOR types
        const defaultPerms =
            data.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO"
                ? { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: true, permisoVerMetricasGlobales: true }
                : { permisoEditarProyecto: false, permisoSubirDocumentacion: false, permisoVerLeadsGlobales: false, permisoVerMetricasGlobales: false };

        const orgId = isAdmin ? (targetUser.orgId ?? ctx.proyecto.orgId) : user.orgId;
        if (!orgId) {
            return { success: false, error: "No se pudo determinar la organización" };
        }

        const relacion = await prisma.proyectoUsuario.upsert({
            where:  { proyectoId_userId: { proyectoId: data.proyectoId, userId: data.targetUserId } },
            update: {
                tipoRelacion:         data.tipoRelacion,
                estadoRelacion:       "PENDIENTE",
                tipoMandato:          data.tipoMandato,
                documentoMandatoUrl:  data.documentoMandatoUrl,
                mandatoVigenciaDesde: desde,
                mandatoVigenciaHasta: hasta,
                notas:                data.notas ?? null,
                asignadoPorId:        user.id,
                // Reset previous approval fields on re-submission
                aprobadoPorAdminId:   null,
                fechaConfirmacion:    null,
                confirmadoPorEmpresa: false,
                ...defaultPerms,
            },
            create: {
                proyectoId:           data.proyectoId,
                userId:               data.targetUserId,
                orgId,
                tipoRelacion:         data.tipoRelacion,
                estadoRelacion:       "PENDIENTE",
                tipoMandato:          data.tipoMandato,
                documentoMandatoUrl:  data.documentoMandatoUrl,
                mandatoVigenciaDesde: desde,
                mandatoVigenciaHasta: hasta,
                notas:                data.notas ?? null,
                asignadoPorId:        user.id,
                ...defaultPerms,
            },
        });

        await audit({
            userId:   user.id,
            action:   "COMERCIALIZADOR_RELACION_SUBMITTED",
            entity:   "ProyectoUsuario",
            entityId: relacion.id,
            details:  {
                proyectoId:    data.proyectoId,
                targetUserId:  data.targetUserId,
                targetNombre:  targetUser.nombre,
                tipoRelacion:  data.tipoRelacion,
                tipoMandato:   data.tipoMandato,
                vigenciaDesde: data.mandatoVigenciaDesde,
                vigenciaHasta: data.mandatoVigenciaHasta,
            },
        });

        // Notify all admins of pending mandate for review
        const proyectoRow = await prisma.proyecto.findUnique({
            where: { id: data.proyectoId },
            select: { nombre: true },
        });
        const proyectoNombre = proyectoRow?.nombre ?? data.proyectoId;

        const admins = await prisma.user.findMany({
            where: { rol: { in: ["ADMIN", "SUPERADMIN"] } },
            select: { id: true },
        });
        await Promise.all(
            admins.map(a =>
                createNotification(
                    a.id,
                    "INFO",
                    `Mandato pendiente de aprobación: ${proyectoNombre}`,
                    `El usuario "${targetUser.nombre}" fue propuesto como ${data.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" ? "comercializador exclusivo" : "comercializador no exclusivo"} del proyecto "${proyectoNombre}". Revisá y aprobá o rechazá el mandato.`,
                    `/dashboard/admin/proyectos/${data.proyectoId}`,
                )
            )
        );

        revalidatePath(`/dashboard/developer/proyectos/${data.proyectoId}`);
        return { success: true, data: relacion };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── approveMandate ───────────────────────────────────────────────────────────

/**
 * ADMIN-only: approve a PENDIENTE COMERCIALIZADOR_* mandate.
 * Transitions estadoRelacion to ACTIVA, records who approved and when.
 * Notifies the comercializador.
 *
 * NOTE — confirmadoPorEmpresa semantics (current vs future):
 *   Today: `confirmadoPorEmpresa=true` is set here as part of the admin's internal
 *   approval decision. It signals "an admin reviewed and authorized this mandate",
 *   NOT that the developing company externally confirmed the comercializador.
 *
 *   Future: when real external confirmation exists (e.g. empresa signs/acknowledges
 *   via a separate flow — webhook, signed doc upload, legal step), that flow should
 *   set `confirmadoPorEmpresa` independently, and this function should either NOT
 *   set it (leaving it false until external confirmation), or a separate action
 *   (e.g. `confirmMandateByEmpresa`) should handle the external step.
 *
 *   Until that flow is built, `confirmadoPorEmpresa=true` here means
 *   "admin-approved" and should be interpreted as such in any downstream logic.
 */
export async function approveMandate(input: unknown) {
    try {
        const admin = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const parsed = mandateActionSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { proyectoId, targetUserId } = parsed.data;

        const relacion = await prisma.proyectoUsuario.findUnique({
            where:  { proyectoId_userId: { proyectoId, userId: targetUserId } },
            select: { id: true, tipoRelacion: true, estadoRelacion: true },
        });

        if (!relacion) {
            return { success: false, error: "Relación no encontrada" };
        }
        if (relacion.tipoRelacion !== "COMERCIALIZADOR_EXCLUSIVO" && relacion.tipoRelacion !== "COMERCIALIZADOR_NO_EXCLUSIVO") {
            return { success: false, error: "Solo se pueden aprobar mandatos de tipo COMERCIALIZADOR" };
        }
        if (relacion.estadoRelacion !== "PENDIENTE") {
            return { success: false, error: `El mandato no está en estado PENDIENTE (estado actual: ${relacion.estadoRelacion})` };
        }

        await prisma.proyectoUsuario.update({
            where: { proyectoId_userId: { proyectoId, userId: targetUserId } },
            data:  {
                estadoRelacion:       "ACTIVA",
                confirmadoPorEmpresa: true,
                aprobadoPorAdminId:   admin.id,
                fechaConfirmacion:    new Date(),
            },
        });

        await audit({
            userId:   admin.id,
            action:   "MANDATE_APPROVED",
            entity:   "ProyectoUsuario",
            entityId: relacion.id,
            details:  { proyectoId, targetUserId, tipoRelacion: relacion.tipoRelacion },
        });

        // Notify the comercializador
        const proyectoRow = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { nombre: true },
        });
        const proyectoNombre = proyectoRow?.nombre ?? proyectoId;

        await createNotification(
            targetUserId,
            "EXITO",
            `Mandato aprobado: ${proyectoNombre}`,
            `Tu mandato como ${relacion.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" ? "comercializador exclusivo" : "comercializador no exclusivo"} del proyecto "${proyectoNombre}" fue aprobado. Ya podés operar comercialmente.`,
            `/dashboard/developer/proyectos/${proyectoId}`,
        );

        revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── getPendingMandates ───────────────────────────────────────────────────────

/**
 * ADMIN-only: returns all PENDIENTE COMERCIALIZADOR_* mandates across the platform.
 * Optionally scoped to a single project via proyectoId.
 *
 * Ordered by createdAt ASC (FIFO — oldest pending first) so admins process
 * mandates in submission order.
 *
 * Each entry includes:
 *  - proyecto: name + orgId (for admin context)
 *  - user: the proposed comercializador
 *  - asignadoPor: who submitted the relation (usually the OWNER)
 *  - mandate fields: tipoRelacion, tipoMandato, vigenciaDesde, vigenciaHasta, documentoMandatoUrl
 */
export async function getPendingMandates(proyectoId?: string) {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const mandates = await prisma.proyectoUsuario.findMany({
            where: {
                tipoRelacion:   { in: ["COMERCIALIZADOR_EXCLUSIVO", "COMERCIALIZADOR_NO_EXCLUSIVO"] },
                estadoRelacion: "PENDIENTE",
                ...(proyectoId ? { proyectoId } : {}),
            },
            select: {
                id:                   true,
                tipoRelacion:         true,
                tipoMandato:          true,
                mandatoVigenciaDesde: true,
                mandatoVigenciaHasta: true,
                documentoMandatoUrl:  true,
                notas:                true,
                createdAt:            true,
                proyecto: {
                    select: { id: true, nombre: true, orgId: true },
                },
                user: {
                    select: { id: true, nombre: true, email: true },
                },
                asignadoPor: {
                    select: { id: true, nombre: true },
                },
            },
            orderBy: { createdAt: "asc" },
        });

        return { success: true, data: mandates };
    } catch (error) {
        return handleGuardError(error);
    }
}

// ─── rejectMandate ────────────────────────────────────────────────────────────

/**
 * ADMIN-only: reject a PENDIENTE COMERCIALIZADOR_* mandate.
 * Transitions estadoRelacion to RECHAZADA.
 * Notifies the comercializador with optional motivo.
 */
export async function rejectMandate(input: unknown) {
    try {
        const admin = await requireAnyRole(["ADMIN", "SUPERADMIN"]);

        const parsed = mandateActionSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        }
        const { proyectoId, targetUserId, motivo } = parsed.data;

        const relacion = await prisma.proyectoUsuario.findUnique({
            where:  { proyectoId_userId: { proyectoId, userId: targetUserId } },
            select: { id: true, tipoRelacion: true, estadoRelacion: true },
        });

        if (!relacion) {
            return { success: false, error: "Relación no encontrada" };
        }
        if (relacion.tipoRelacion !== "COMERCIALIZADOR_EXCLUSIVO" && relacion.tipoRelacion !== "COMERCIALIZADOR_NO_EXCLUSIVO") {
            return { success: false, error: "Solo se pueden rechazar mandatos de tipo COMERCIALIZADOR" };
        }
        if (relacion.estadoRelacion !== "PENDIENTE") {
            return { success: false, error: `El mandato no está en estado PENDIENTE (estado actual: ${relacion.estadoRelacion})` };
        }

        await prisma.proyectoUsuario.update({
            where: { proyectoId_userId: { proyectoId, userId: targetUserId } },
            data:  { estadoRelacion: "RECHAZADA" },
        });

        await audit({
            userId:   admin.id,
            action:   "MANDATE_REJECTED",
            entity:   "ProyectoUsuario",
            entityId: relacion.id,
            details:  { proyectoId, targetUserId, tipoRelacion: relacion.tipoRelacion, motivo: motivo ?? null },
        });

        // Notify the comercializador
        const proyectoRow = await prisma.proyecto.findUnique({
            where: { id: proyectoId },
            select: { nombre: true },
        });
        const proyectoNombre = proyectoRow?.nombre ?? proyectoId;

        await createNotification(
            targetUserId,
            "ERROR",
            `Mandato rechazado: ${proyectoNombre}`,
            `Tu mandato como ${relacion.tipoRelacion === "COMERCIALIZADOR_EXCLUSIVO" ? "comercializador exclusivo" : "comercializador no exclusivo"} del proyecto "${proyectoNombre}" fue rechazado por un administrador.${motivo ? ` Motivo: ${motivo}` : ""} Contactá al propietario del proyecto para más información.`,
            `/dashboard/developer/proyectos/${proyectoId}`,
        );

        revalidatePath(`/dashboard/admin/proyectos/${proyectoId}`);
        revalidatePath(`/dashboard/developer/proyectos/${proyectoId}`);
        return { success: true };
    } catch (error) {
        return handleGuardError(error);
    }
}
