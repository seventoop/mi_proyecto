import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { handleApiGuardError } from "@/lib/guards";
import { createNotification } from "@/lib/actions/notifications";
import { audit } from "@/lib/actions/audit";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { requestId: string } }
) {
    try {
        const adminUser = await requirePermission(PERMISSIONS.ROLE_REQUESTS_MANAGE);
        const requestId = params.requestId;
        const body = await req.json();
        const decision = typeof body?.decision === "string"
            ? body.decision.toUpperCase().trim()
            : "";

        if (!["APROBAR", "RECHAZAR"].includes(decision)) {
            return NextResponse.json(
                { error: "Acción inválida." },
                { status: 400 }
            );
        }

        const requestRecord = await prisma.roleChangeRequest.findUnique({
            where: { id: requestId },
            select: {
                id: true,
                userId: true,
                currentRole: true,
                requestedRole: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        nombre: true,
                        email: true,
                        rol: true,
                    },
                },
            },
        });

        if (!requestRecord) {
            return NextResponse.json(
                { error: "Solicitud no encontrada." },
                { status: 404 }
            );
        }

        if (requestRecord.status !== "PENDIENTE") {
            return NextResponse.json(
                { error: "La solicitud ya fue resuelta." },
                { status: 409 }
            );
        }

        if (requestRecord.userId === adminUser.id) {
            return NextResponse.json(
                { error: "No podés resolver tu propia solicitud." },
                { status: 403 }
            );
        }

        if (decision === "APROBAR") {
            const updated = await prisma.$transaction(async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id: requestRecord.userId },
                    data: { rol: requestRecord.requestedRole },
                    select: {
                        id: true,
                        rol: true,
                        nombre: true,
                        email: true,
                    },
                });

                const updatedRequest = await tx.roleChangeRequest.update({
                    where: { id: requestRecord.id },
                    data: { status: "APROBADA" },
                    select: {
                        id: true,
                        status: true,
                        requestedRole: true,
                        currentRole: true,
                        updatedAt: true,
                    },
                });

                return { updatedUser, updatedRequest };
            });

            await createNotification(
                requestRecord.userId,
                "EXITO",
                "Solicitud de cambio de rol aprobada",
                `Tu solicitud fue aprobada. Tu nuevo rol es ${updated.updatedUser.rol}.`,
                "/dashboard/configuracion",
                false
            );

            await audit({
                userId: adminUser.id,
                action: "ROLE_CHANGE_REQUEST_APPROVED",
                entity: "RoleChangeRequest",
                entityId: requestRecord.id,
                details: {
                    targetUserId: requestRecord.userId,
                    previousRole: requestRecord.currentRole,
                    assignedRole: updated.updatedUser.rol,
                },
            });

            return NextResponse.json({
                success: true,
                data: {
                    id: updated.updatedRequest.id,
                    status: updated.updatedRequest.status,
                    userId: requestRecord.userId,
                    newRole: updated.updatedUser.rol,
                },
            });
        }

        const rejectedRequest = await prisma.roleChangeRequest.update({
            where: { id: requestRecord.id },
            data: { status: "RECHAZADA" },
            select: {
                id: true,
                status: true,
                requestedRole: true,
                updatedAt: true,
            },
        });

        await createNotification(
            requestRecord.userId,
            "ALERTA",
            "Solicitud de cambio de rol rechazada",
            `Tu solicitud para cambiar al rol ${requestRecord.requestedRole} fue rechazada.`,
            "/dashboard/configuracion",
            false
        );

        await audit({
            userId: adminUser.id,
            action: "ROLE_CHANGE_REQUEST_REJECTED",
            entity: "RoleChangeRequest",
            entityId: requestRecord.id,
            details: {
                targetUserId: requestRecord.userId,
                currentRole: requestRecord.currentRole,
                requestedRole: requestRecord.requestedRole,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: rejectedRequest.id,
                status: rejectedRequest.status,
                userId: requestRecord.userId,
            },
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
