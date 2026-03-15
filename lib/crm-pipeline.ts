import prisma from "@/lib/db";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";
import { runWorkflow } from "@/lib/workflow-engine";

export type LeadReceptionInput = {
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    origen?: string; // e.g. "WEB", "FACEBOOK", "WHATSAPP", "REFERIDO"
    canalOrigen?: string; // e.g. "WEB", "FACEBOOK", "WHATSAPP"
    mensaje?: string | null; // raw plain text message
    notas?: string | null; // JSON string for structured notes
    proyectoId?: string | null;
    unidadInteres?: string | null; // e.g. "[unit_id]"
    campanaId?: string | null;
    adId?: string | null;
    asignadoAId?: string | null;
    orgId?: string | null;
    estado?: string;
    automationStatus?: "PENDING" | "PILOT" | "IGNORED";
    communityType?: string | null;
    
    // Config for reception
    sourceType: "MANUAL" | "LANDING" | "CONTACTO" | "API_CRM" | "WEBHOOK_META" | "WEBHOOK_WHATSAPP" | "WEBHOOK_TIKTOK" | "PUBLIC_FORM" | "BULK";
    rawPayloadForIntake?: any; // To store if it goes to quarantine
    skipAutomations?: boolean; // For manual or bulk if we don't want to spam webhooks
};

export type LeadReceptionResult = {
    success: boolean;
    leadId?: string;
    intakeId?: string;
    error?: string;
    status: "CREATED" | "UPDATED" | "QUARANTINED" | "SKIPPED";
};

/**
 * executeLeadReception
 * Central Source of Truth for the initial entry of a Lead into the CRM.
 * Responsibilities:
 * 1. Persist the lead (or update if deduplication strategy matches)
 * 2. Quarantine to LeadIntake if tenant (orgId) is missing.
 * 3. Create Oportunidad (if proyectoId exists)
 * 4. Dispatch AI Lead Scoring
 * 5. Dispatch native Workflows (trigger: NEW_LEAD)
 * 6. Dispatch LogicToop integration
 */
export async function executeLeadReception(input: LeadReceptionInput): Promise<LeadReceptionResult> {
    try {
        // 1. Resolve & Enforce Tenant (OrgId)
        if (!input.orgId && (input.sourceType === "LANDING" || input.sourceType === "WEBHOOK_WHATSAPP" || input.sourceType === "WEBHOOK_TIKTOK" || input.sourceType === "CONTACTO")) {
            // Unresolved tenant, send to Intake Quarantine
            const intake = await (prisma as any).leadIntake.create({
                data: {
                    source: input.sourceType,
                    rawPayload: input.rawPayloadForIntake || input,
                    status: "PENDING",
                    error: "No se pudo resolver el orgId para esta recepción."
                }
            });

            await (prisma as any).auditLog.create({
                data: {
                    userId: "system",
                    action: "TENANT_RESOLUTION_FAILED",
                    entity: "Lead",
                    details: JSON.stringify({ source: input.sourceType, input })
                }
            });

            console.warn(`[Pipeline] Lead sent to intake, no orgId resolved. Source: ${input.sourceType}`);
            return { success: true, intakeId: intake.id, status: "QUARANTINED" };
        }

        if (!input.orgId) {
            throw new Error(`orgId es obligatorio para procesar el lead. Source: ${input.sourceType}`);
        }

        // 2. Persist Lead
        const lead = await prisma.lead.create({
            data: {
                nombre: input.nombre,
                email: input.email || null,
                telefono: input.telefono || null,
                origen: input.origen || "WEB",
                canalOrigen: input.canalOrigen || "WEB",
                proyectoId: input.proyectoId || null,
                unidadInteres: input.unidadInteres || null,
                estado: input.estado || "NUEVO",
                notas: input.notas || "[]",
                mensaje: input.mensaje || null,
                campanaId: input.campanaId || null,
                adId: input.adId || null,
                asignadoAId: input.asignadoAId || null,
                orgId: input.orgId,
                automationStatus: input.automationStatus || "PENDING",
                communityType: input.communityType as any || null,
            }
        });

        // 3. Audit Log
        await (prisma.auditLog.create({
            data: {
                userId: input.asignadoAId || "system",
                action: "LEAD_CREATED",
                entity: "Lead",
                entityId: lead.id,
                details: JSON.stringify({ source: input.sourceType, orgId: input.orgId })
            }
        }) as any);

        // --- Asynchronous Post-Processing ---
        if (!input.skipAutomations) {
            // We run these async without awaiting to avoid blocking the pipeline
            (async () => {
                try {
                    // 4. Create Opportunity
                    if (input.proyectoId) {
                        await prisma.oportunidad.create({
                            data: {
                                leadId: lead.id,
                                proyectoId: input.proyectoId,
                                unidadId: input.unidadInteres ? input.unidadInteres.replace(/[\[\]"]/g, "") : null, // Clean up JSON string to raw ID if possible, though currently schema is string
                                etapa: "NUEVO",
                                probabilidad: 10,
                                proximaAccion: "Contactar al cliente",
                            }
                        });
                    }

                    // 5. Fire AI Lead Scoring
                    await aiLeadScoring(lead.id).catch(err => {
                        console.error("[Pipeline] AI Scoring failed:", err.message);
                    });

                    // 6. Native Workflows (Skip if LogicToop is primary or per input)
                    if (input.orgId && !input.skipAutomations) {
                        // Check if LogicToop is preferred org configuration (Simplified check for now)
                        const workflows = await prisma.workflow.findMany({
                            where: { orgId: input.orgId, trigger: "NEW_LEAD", activo: true },
                            select: { id: true }
                        });
                        for (const wf of workflows) {
                            runWorkflow(wf.id, "NEW_LEAD", lead.id).catch(console.error);
                        }
                    }

                    // 7. LogicToop Integration
                    if (input.orgId) {
                        try {
                            const { dispatchTrigger } = await import("@/lib/logictoop/dispatcher");
                            await dispatchTrigger("NEW_LEAD", { leadId: lead.id, proyectoId: input.proyectoId || null }, input.orgId);
                        } catch (e: any) {
                            console.error("[Pipeline] LogicToop dispatch failed:", e.message);
                        }
                    }
                } catch (asyncErr) {
                    console.error("[Pipeline] Async automations failed:", asyncErr);
                }
            })();
        }

        return { success: true, leadId: lead.id, status: "CREATED" };

    } catch (error: any) {
        console.error("[Pipeline] Error in executeLeadReception:", error);
        return { success: false, error: error.message, status: "QUARANTINED" };
    }
}
