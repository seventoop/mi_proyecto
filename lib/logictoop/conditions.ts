/**
 * LogicToop V1 Conditions Evaluator
 * Handles logic evaluation for automation flows.
 */

export type ConditionOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "INCLUDES";

export interface Condition {
    field: string;
    operator: ConditionOperator;
    value: any;
}

/**
 * Evaluates a single condition against a payload.
 */
export function evaluateCondition(condition: Condition, payload: any): boolean {
    // Support dot notation for nested properties (e.g. "ai.score")
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const fieldValue = getNestedValue(payload, condition.field);
    
    // If field doesn't exist, we consider it fails unless it's a NOT_EQUALS check against undefined
    if (fieldValue === undefined && condition.operator !== "NOT_EQUALS") {
        return false;
    }

    switch (condition.operator) {
        case "EQUALS":
            return fieldValue == condition.value;
        case "NOT_EQUALS":
            return fieldValue != condition.value;
        case "GREATER_THAN":
            return Number(fieldValue) > Number(condition.value);
        case "LESS_THAN":
            return Number(fieldValue) < Number(condition.value);
        case "INCLUDES":
            if (typeof fieldValue === "string") {
                return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.includes(condition.value);
            }
            return false;
        default:
            console.warn(`[LogicToop] Unknown operator: ${condition.operator}`);
            return true; 
    }
}

/**
 * Evaluates a set of conditions. Currently implements AND logic.
 */
export function evaluateConditionSet(conditions: Condition[] | undefined, payload: any): boolean {
    if (!conditions || conditions.length === 0) return true;
    
    for (const cond of conditions) {
        if (!evaluateCondition(cond, payload)) {
            return false;
        }
    }
    
    return true;
}
