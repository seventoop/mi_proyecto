/**
 * LogicToop V1 Node Registry Types
 */

export type NodeCategory = 
    | "Triggers"
    | "CRM"
    | "Messaging"
    | "Automation"
    | "Conditions"
    | "Wait"
    | "Integrations"
    | "AI"
    | "Agents";

export interface NodeConfigField {
    id: string;
    label: string;
    type: "text" | "number" | "select" | "textarea" | "checkbox";
    placeholder?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    defaultValue?: any;
}

export interface NodeDefinition {
    type: string;
    label: string;
    category: NodeCategory;
    icon: string;
    description?: string;
    configSchema: NodeConfigField[];
    handler: (config: any, payload: any, orgId: string) => Promise<any>;
}
