import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { handleApiGuardError, requireAuth } from "@/lib/guards";
import {
    getPublicAssignableRoles,
    isPublicAssignableRole,
} from "@/lib/auth/registration-policy";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/mail";
import { createNotification } from "@/lib/actions/notifications";
import { audit } from "@/lib/actions/audit";
import { PERMISSIONS, requirePermission } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
    try {
        await requirePermission(PERMISSIONS.ROLE_REQUESTS_MANAGE);

        const status = req.nextUrl.searchParams.get("status")?.toUpperCase().trim() || "PENDIENTE";
        const where = status ? { status } : {};

        const requests = await prisma.roleChangeRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                currentRole: true,
                requestedRole: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
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

        return NextResponse.json({ success: true, data: requests });
    } catch (error) {
        return handleApiGuardError(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await req.json();
        const requestedRole = typeof body?.requestedRole === "string"
            ? body.requestedRole.toUpperCase().trim()
            : "";

        if (!isPublicAssignableRole(requestedRole)) {
            return NextResponse.json(
                { error: "Rol no permitido para solicitud pública." },
                { status: 400 }
            );
        }

        if (requestedRole === user.role) {
            return NextResponse.json(
                { error: "Ya tenés ese rol asignado actualmente." },
                { status: 400 }
            );
        }

        const ip = getClientIp(req);
        const { allowed } = await checkRateLimit(`${user.id}:${ip}`, {
            limit: 3,
            windowMs: 60 * 60 * 1000,
            keyPrefix: "role_change_request:",
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes. Probá nuevamente más tarde." },
                { status: 429 }
            );
        }

        const existingPending = await prisma.roleChangeRequest.findFirst({
            where: {
                userId: user.id,
                status: "PENDIENTE",
            },
            select: {
                id: true,
                requestedRole: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        if (existingPending) {
            return NextResponse.json(
                { error: "Ya existe una solicitud pendiente de revisión." },
                { status: 409 }
            );
        }

        const requestRecord = await prisma.roleChangeRequest.create({
            data: {
                userId: user.id,
                currentRole: user.role,
                requestedRole,
                status: "PENDIENTE",
            },
        });

        const adminUsers = await prisma.user.findMany({
            where: {
                rol: { in: ["ADMIN", "SUPERADMIN"] },
            },
            select: {
                id: true,
                email: true,
                nombre: true,
            },
        });

        const dashboardLink = "/dashboard/configuracion";
        const message = `${user.name} (${user.email}) solicitó cambiar su rol de ${user.role} a ${requestedRole}.`;

        await Promise.all(
            adminUsers.map((adminUser) =>
                createNotification(
                    adminUser.id,
                    "INFO",
                    "Nueva solicitud de cambio de rol",
                    message,
                    dashboardLink,
                    false
                )
            )
        );

        const adminEmails = adminUsers
            .map((adminUser) => adminUser.email)
            .filter((email): email is string => Boolean(email));

        if (adminEmails.length > 0) {
            const emailResult = await sendTransactionalEmail({
                to: adminEmails,
                subject: "SevenToop: nueva solicitud de cambio de rol",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 24px;">
                        <h2>Nueva solicitud de cambio de rol</h2>
                        <p><strong>Usuario:</strong> ${user.name} (${user.email})</p>
                        <p><strong>Rol actual:</strong> ${user.role}</p>
                        <p><strong>Rol solicitado:</strong> ${requestedRole}</p>
                        <p>La solicitud quedó registrada con estado <strong>PENDIENTE</strong>.</p>
                    </div>
                `,
                text: `Solicitud de cambio de rol: ${user.email} pidió pasar de ${user.role} a ${requestedRole}.`,
            });

            if (!emailResult.success) {
                console.log("[ROLE_CHANGE_REQUEST_EMAIL_FALLBACK]", {
                    requestId: requestRecord.id,
                    requestedBy: user.email,
                    requestedRole,
                    availableRoles: getPublicAssignableRoles(),
                    reason: emailResult.error,
                });
            }
        } else {
            console.log("[ROLE_CHANGE_REQUEST_NOTIFICATION]", {
                requestId: requestRecord.id,
                requestedBy: user.email,
                requestedRole,
                reason: "No admin emails found",
            });
        }

        await audit({
            userId: user.id,
            action: "ROLE_CHANGE_REQUEST_CREATED",
            entity: "RoleChangeRequest",
            entityId: requestRecord.id,
            details: {
                currentRole: user.role,
                requestedRole,
                status: requestRecord.status,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: requestRecord.id,
                status: requestRecord.status,
                currentRole: requestRecord.currentRole,
                requestedRole: requestRecord.requestedRole,
                createdAt: requestRecord.createdAt,
            },
        });
    } catch (error) {
        return handleApiGuardError(error);
    }
}
