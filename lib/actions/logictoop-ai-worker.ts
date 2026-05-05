"use server";

import { requireAuth, AuthError } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { runApprovedAiTaskDryRun } from "@/lib/logictoop/ai-worker";

interface WorkerActionResult {
    success: boolean;
    error?: string;
    taskId?: string;
    status?: string;
    message?: string;
}

/**
 * Server Action para ejecutar manualmente el dry-run del worker.
 * Restringido a SUPERADMIN (Fase 4A).
 */
export async function executeAiTaskDryRun(taskId: string): Promise<WorkerActionResult> {
    try {
        // 1. Autenticación y Autorización
        const user = await requireAuth();
        
        if (user.role !== "SUPERADMIN") {
            throw new AuthError("Solo los Superadministradores pueden ejecutar el dry-run del worker en esta fase.", 403);
        }

        // 2. Feature Flags
        const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";
        const isRealConnection = process.env.FEATURE_FLAG_PAPERCLIP_REAL_CONNECTION === "true";

        if (!isCoreEnabled) {
            return { success: false, error: "El core de IA está desactivado." };
        }

        if (isRealConnection) {
            return { success: false, error: "No se permite la ejecución de worker con Paperclip conectado actualmente." };
        }

        // 3. Ejecución del Worker Inerte
        const result = await runApprovedAiTaskDryRun({
            taskId,
            actorUserId: user.id,
            actorRole: user.role,
            actorOrgId: user.orgId || null
        });

        if (result.success) {
            // 4. Actualizar UI
            revalidatePath("/dashboard/admin/logictoop/orchestrator/approvals");
            return {
                success: true,
                taskId: result.taskId,
                status: result.status,
                message: result.message
            };
        } else {
            return {
                success: false,
                error: result.error
            };
        }

    } catch (error: any) {
        console.error("[LogicToop Action] Error executing worker dry-run:", error);
        return {
            success: false,
            error: error instanceof AuthError ? error.message : "Error interno al ejecutar el worker dry-run"
        };
    }
}
