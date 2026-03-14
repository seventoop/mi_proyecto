import { nodeRegistry } from "./nodeRegistry";
import { assignLeadNode, createTaskNode, moveLeadStageNode } from "./definitions/crm";
import { sendEmailNode, sendWhatsAppNode } from "./definitions/messaging";
import { notifyInternalNode, addAuditLogNode, waitNode } from "./definitions/automation";
import { aiClassifyLeadNode, aiScoreLeadNode, aiSummarizeNode, aiRouteNode } from "./definitions/ai";
import { httpRequestNode, whatsappSendMessageNode, metaConversionNode, googleSheetsAppendNode } from "./definitions/integrations";
import { webhookTriggerNode } from "./definitions/triggers";
import { aiAgentSalesNode, aiAgentFollowupNode, aiAgentRouterNode } from "./definitions/agents";

/**
 * Initializes the node registry with all supported nodes.
 */
export function initNodeRegistry() {
    nodeRegistry.register(assignLeadNode);
    nodeRegistry.register(createTaskNode);
    nodeRegistry.register(moveLeadStageNode);
    nodeRegistry.register(sendEmailNode);
    nodeRegistry.register(sendWhatsAppNode);
    nodeRegistry.register(notifyInternalNode);
    nodeRegistry.register(addAuditLogNode);
    nodeRegistry.register(waitNode);
    
    // Webhook Trigger
    nodeRegistry.register(webhookTriggerNode);
    
    // AI Nodes
    nodeRegistry.register(aiClassifyLeadNode);
    nodeRegistry.register(aiScoreLeadNode);
    nodeRegistry.register(aiSummarizeNode);
    nodeRegistry.register(aiRouteNode);

    // Integration Nodes
    nodeRegistry.register(httpRequestNode);
    nodeRegistry.register(whatsappSendMessageNode);
    nodeRegistry.register(metaConversionNode);
    nodeRegistry.register(googleSheetsAppendNode);

    // Agent Nodes
    nodeRegistry.register(aiAgentSalesNode);
    nodeRegistry.register(aiAgentFollowupNode);
    nodeRegistry.register(aiAgentRouterNode);
    
    // Condition node is special but can be registered for UI metadata
    nodeRegistry.register({
        type: "CONDITION",
        label: "Condición (IF)",
        category: "Conditions",
        icon: "filter",
        configSchema: [
            { id: "field", label: "Campo", type: "text", required: true },
            { 
                id: "operator", 
                label: "Operador", 
                type: "select", 
                options: [
                    { label: "Igual", value: "EQUALS" },
                    { label: "Distinto", value: "NOT_EQUALS" },
                    { label: "Contiene", value: "INCLUDES" }
                ],
                required: true 
            },
            { id: "value", label: "Valor", type: "text", required: true }
        ],
        handler: async () => ({ isCondition: true })
    });
}
