/**
 * LogicToop V1 Builder Utilities
 * Handles flow configuration schema, validation, and normalization.
 */

export interface StepConfig {
    uid: string;
    type: "ACTION" | "CONDITION" | "WAIT";
    label: string;
    config: any;
    conditions?: any[];
}

export interface FlowConfig {
    version: number;
    steps: StepConfig[];
}

/**
 * Validates and normalizes a flow configuration.
 * Ensures every step has a unique ID and follows the expected structure.
 */
export function normalizeFlowConfig(rawActions: any): FlowConfig {
    const actions = Array.isArray(rawActions) ? rawActions : [];
    
    const steps: StepConfig[] = actions.map((action: any, index: number) => {
        return {
            uid: action.uid || `step-${Date.now()}-${index}`,
            type: action.type || "ACTION",
            label: action.label || action.type || "Paso sin nombre",
            config: action.config || {},
            conditions: action.conditions || []
        };
    });

    return {
        version: 1,
        steps
    };
}

/**
 * Validates a single step configuration.
 */
export function validateStep(step: StepConfig): { valid: boolean; error?: string } {
    if (!step.type) return { valid: false, error: "Tipo de paso no especificado" };
    
    if (step.type === "WAIT") {
        if (!step.config.minutes && !step.config.hours && !step.config.days) {
            return { valid: false, error: "Debe especificar un tiempo de espera" };
        }
    }

    if (step.type === "CONDITION") {
        if (!step.config.field || !step.config.operator) {
            return { valid: false, error: "Configuración de condición incompleta" };
        }
    }

    return { valid: true };
}

/**
 * Maps execution logs to visual steps based on index.
 * In Phase 4 (Linear), logs[i] corresponds to steps[i].
 */
export function mapLogsToSteps(steps: StepConfig[], logs: any[]) {
    return steps.map((step, index) => {
        const log = logs[index];
        return {
            ...step,
            status: log ? log.status : "PENDING",
            details: log ? log.details : null,
            startedAt: log ? log.startedAt : null,
            finishedAt: log ? log.finishedAt : null
        };
    });
}
