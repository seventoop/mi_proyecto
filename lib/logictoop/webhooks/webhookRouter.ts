import { db } from "@/lib/db";
import { executeFlow } from "../dispatcher";

/**
 * LogicToop V1 Webhook Router
 * Handles secure inbound external signals to trigger flows.
 */
export async function handleExternalWebhook(orgId: string, flowId: string, secret: string, payload: any) {
    // 1. Validate Flow & Org
    const flow = await (db as any).logicToopFlow.findFirst({
        where: { 
            id: flowId,
            orgId: orgId,
            activo: true,
        },
        include: { org: true }
    });

    if (!flow) {
        throw new Error("Flow no encontrado o inactivo.");
    }

    // 2. Secret Validation (Simple but effective)
    // We expect a 'webhookSecret' in the flow configuration or metadata
    const flowConfig = flow.actions as any[];
    const triggerNode = flowConfig.find(a => a.type === "WEBHOOK_TRIGGER");
    
    if (!triggerNode) {
        throw new Error("El flow no está configurado para dispararse vía Webhook.");
    }

    const expectedSecret = triggerNode.config?.secret;
    if (!expectedSecret || secret !== expectedSecret) {
        throw new Error("Secret de Webhook inválido.");
    }

    // 3. Dispatch Execution
    // We pass the webhook payload as the initial context
    console.log(`[LogicToop Webhook] Triggering flow ${flowId} for org ${orgId}`);
    
    return executeFlow(flowId, {
        ...payload,
        triggeredBy: "WEBHOOK",
        webhookTimestamp: new Date().toISOString()
    });
}
