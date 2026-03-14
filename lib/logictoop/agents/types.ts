export interface AgentMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: any[];
    name?: string;
}

export interface AgentToolDefinition {
    name: string;
    description: string;
    parameters: any; // JSON Schema
    handler: (args: any, context: AgentContext) => Promise<any>;
}

export interface AgentContext {
    orgId: string;
    leadId?: string;
    executionId: string;
    payload: any;
}

export interface AgentDecision {
    thought: string;
    toolCalls: Array<{
        id: string;
        name: string;
        args: any;
        result?: any;
    }>;
    finalAnswer?: string;
}

export interface AgentRuntimeOptions {
    maxIterations?: number;
    model?: string;
    temperature?: number;
}
