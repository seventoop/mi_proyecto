
/**
 * Clasificación de seguridad para nodos de LogicToop Flow.
 */
export type NodeSafetyClassification = 
  | "SAFE_REVIEW_ONLY" 
  | "UNSAFE_SIDE_EFFECT" 
  | "UNKNOWN" 
  | "NO_NEXT_NODE";

/**
 * Recomendación operativa para el administrador.
 */
export type ResumeRecommendation = 
  | "SAFE_TO_REVIEW" 
  | "BLOCKED_UNSAFE_NODE" 
  | "UNKNOWN_NEXT_NODE" 
  | "NO_NEXT_NODE";

/**
 * Mapa de clasificación de nodos basado en el registro oficial.
 */
const NODE_SAFETY_MAP: Record<string, NodeSafetyClassification> = {
    // Nodos seguros (Inertes o de lectura)
    "AI_APPROVAL_TASK": "SAFE_REVIEW_ONLY",
    "AI_CLASSIFY_LEAD": "SAFE_REVIEW_ONLY",
    "AI_SCORE_LEAD": "SAFE_REVIEW_ONLY",
    "AI_SUMMARIZE_LEAD_CONTEXT": "SAFE_REVIEW_ONLY",
    "AI_ROUTE_LEAD": "SAFE_REVIEW_ONLY",
    "CONDITION": "SAFE_REVIEW_ONLY",
    "WAIT": "SAFE_REVIEW_ONLY",
    "DELAY": "SAFE_REVIEW_ONLY",
    "NOTIFY_INTERNAL": "SAFE_REVIEW_ONLY",
    "ADD_AUDIT_LOG": "SAFE_REVIEW_ONLY",
    "GOOGLE_CALENDAR_LIST_AVAILABILITY": "SAFE_REVIEW_ONLY",
    "GOOGLE_CALENDAR_GET_EVENT": "SAFE_REVIEW_ONLY",
    "INTERNAL_NOTE": "SAFE_REVIEW_ONLY",

    // Nodos riesgosos (Side-effects comerciales o externos)
    "ASSIGN_LEAD": "UNSAFE_SIDE_EFFECT",
    "CREATE_TASK": "UNSAFE_SIDE_EFFECT",
    "MOVE_LEAD_STAGE": "UNSAFE_SIDE_EFFECT",
    "SEND_EMAIL": "UNSAFE_SIDE_EFFECT",
    "SEND_WHATSAPP": "UNSAFE_SIDE_EFFECT",
    "WHATSAPP_SEND_MESSAGE": "UNSAFE_SIDE_EFFECT",
    "HTTP_REQUEST": "UNSAFE_SIDE_EFFECT",
    "META_CONVERSION": "UNSAFE_SIDE_EFFECT",
    "GOOGLE_SHEETS_APPEND": "UNSAFE_SIDE_EFFECT",
    "GOOGLE_CALENDAR_CREATE_EVENT": "UNSAFE_SIDE_EFFECT",
    "GOOGLE_CALENDAR_UPDATE_EVENT": "UNSAFE_SIDE_EFFECT",
    "AI_AGENT_SALES": "UNSAFE_SIDE_EFFECT",
    "AI_AGENT_FOLLOWUP": "UNSAFE_SIDE_EFFECT",
    "AI_AGENT_ROUTER": "UNSAFE_SIDE_EFFECT",
    "WEBHOOK_TRIGGER": "UNSAFE_SIDE_EFFECT"
};

/**
 * Clasifica un nodo por su tipo.
 */
export function classifyNodeSafety(type: string): NodeSafetyClassification {
    return NODE_SAFETY_MAP[type] || "UNKNOWN";
}

/**
 * Obtiene la recomendación basada en la clasificación.
 */
export function getRecommendationForClassification(classification: NodeSafetyClassification): ResumeRecommendation {
    switch (classification) {
        case "SAFE_REVIEW_ONLY": return "SAFE_TO_REVIEW";
        case "UNSAFE_SIDE_EFFECT": return "BLOCKED_UNSAFE_NODE";
        case "NO_NEXT_NODE": return "NO_NEXT_NODE";
        default: return "UNKNOWN_NEXT_NODE";
    }
}

/**
 * Estructura de respuesta para el preview.
 */
export interface ResumePreviewResult {
    executionId: string;
    flowId: string;
    status: string;
    currentStepIndex: number;
    nextNode: {
        uid: string;
        type: string;
        label?: string;
    } | null;
    classification: NodeSafetyClassification;
    recommendation: ResumeRecommendation;
    message: string;
}
