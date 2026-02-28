import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { requireCronSecret } from "@/lib/guards";

/**
 * Cron Job: Expire Demo Projects & Send KYC Reminders
 * Frequency recommendation: Every 1-6 hours via POST
 */
export async function POST(req: NextRequest) {
    try {
        requireCronSecret(req);
        const now = new Date();

        // 1. Find projects that have expired their demo period
        const expiredProjects = await prisma.proyecto.findMany({
            where: {
                isDemo: true,
                demoExpiresAt: { lte: now },
                visibilityStatus: "PUBLICADO"
            },
            include: {
                creadoPor: {
                    select: { id: true, nombre: true }
                }
            }
        });

        const unpublishingResults = {
            count: expiredProjects.length,
            projectIds: [] as string[]
        };

        if (expiredProjects.length > 0) {
            await prisma.$transaction(async (tx) => {
                for (const proyecto of expiredProjects) {
                    // Update project status
                    await tx.proyecto.update({
                        where: { id: proyecto.id },
                        data: {
                            visibilityStatus: "DESPUBLICADO",
                            estado: "SUSPENDIDO"
                        }
                    });

                    // Notify owner
                    if (proyecto.creadoPorId) {
                        await tx.notificacion.create({
                            data: {
                                usuarioId: proyecto.creadoPorId,
                                tipo: "ALERTA",
                                titulo: "Tu demo ha expirado",
                                mensaje: `Tu proyecto "${proyecto.nombre}" ha sido despublicado porque el período de prueba de 48h terminó. Por favor completa tu verificación KYC para reactivarlo.`,
                                linkAccion: "/dashboard/developer/mi-perfil/kyc"
                            }
                        });
                    }
                    unpublishingResults.projectIds.push(proyecto.id);
                }
            });
        }

        // 2. Anti-Spam KYC Reminders (Every 24h)
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Find users with used demo, not verified kyc, and role developer/seller
        const usersToRemind = await prisma.user.findMany({
            where: {
                demoUsed: true,
                kycStatus: { in: ["PENDIENTE", "EN_REVISION", "RECHAZADO"] },
                rol: { in: ["VENDEDOR", "DESARROLLADOR"] }
            },
            select: { id: true, configuracion: true, nombre: true }
        });

        const reminderResults = {
            sent: 0,
            userIds: [] as string[]
        };

        for (const user of usersToRemind) {
            let config: any = {};
            try {
                config = user.configuracion ? JSON.parse(user.configuracion) : {};
            } catch (e) {
                config = {};
            }

            const lastReminder = config.lastKycReminderAt ? new Date(config.lastKycReminderAt) : null;

            if (!lastReminder || lastReminder < dayAgo) {
                // Send notification
                await prisma.notificacion.create({
                    data: {
                        usuarioId: user.id,
                        tipo: "ALERTA",
                        titulo: "Recordatorio: Completa tu verificación KYC",
                        mensaje: "Aún no has completado la verificación de tu identidad. Hazlo ahora para poder publicar nuevos proyectos de forma ilimitada.",
                        linkAccion: "/dashboard/developer/mi-perfil/kyc"
                    }
                });

                // Update last reminder date in config
                config.lastKycReminderAt = now.toISOString();
                await prisma.user.update({
                    where: { id: user.id },
                    data: { configuracion: JSON.stringify(config) }
                });

                reminderResults.sent++;
                reminderResults.userIds.push(user.id);
            }
        }

        return NextResponse.json({
            success: true,
            unpublishing: unpublishingResults,
            reminders: reminderResults
        });
    } catch (error) {
        console.error("Cron Job Error:", error);
        return NextResponse.json({ success: false, error: "Error interno en el job de expiración" }, { status: 500 });
    }
}
