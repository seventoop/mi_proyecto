import OpenAI from "openai";
import { getSystemConfig } from "@/lib/actions/configuration";
import { AgentContext, AgentDecision, AgentRuntimeOptions, AgentMessage } from "./types";
import { AGENT_TOOLS } from "./agentTools";
import { AgentMemory } from "./agentMemory";

/**
 * LogicToop V1 Agent Runtime
 * Orchestrates multi-step reasoning and tool usage.
 */
export async function runAgent(
    systemPrompt: string, 
    userPrompt: string, 
    context: AgentContext,
    options: AgentRuntimeOptions = {}
) {
    const { 
        maxIterations = 5, 
        model = "gpt-4o-mini", 
        temperature = 0 
    } = options;

    const memory = new AgentMemory([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]);

    const decisions: AgentDecision[] = [];

    try {
        const configRes = await getSystemConfig("OPENAI_API_KEY");
        const apiKey = configRes.value || (process.env.OPENAI_API_KEY as string);
        if (!apiKey) throw new Error("OpenAI API Key no configurada.");

        const openai = new OpenAI({ apiKey });

        for (let i = 0; i < maxIterations; i++) {
            const response = await openai.chat.completions.create({
                model,
                messages: memory.getHistory() as any[],
                temperature,
                tools: AGENT_TOOLS.map(t => ({
                    type: "function",
                    function: {
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters
                    }
                })),
                tool_choice: "auto"
            });

            const assistantMessage = response.choices[0].message;
            
            // Add assistant message to memory
            memory.add({
                role: "assistant",
                content: assistantMessage.content || "",
            } as any);

            // If assistant message has tool calls, we need to handle them
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // OpenAI SDK uses tool_calls property on the message
                // We must ensure the message in history has the tool_calls for the next API call
                const lastMsg = memory.getHistory()[memory.getHistory().length - 1] as any;
                lastMsg.tool_calls = assistantMessage.tool_calls;

                const decision: AgentDecision = {
                    thought: assistantMessage.content || "Ejecutando herramientas...",
                    toolCalls: []
                };

                for (const toolCall of (assistantMessage.tool_calls as any[])) {
                    const toolCallAny = toolCall;
                    const toolName = toolCallAny.function?.name;
                    const toolArgsRaw = toolCallAny.function?.arguments;

                    const tool = AGENT_TOOLS.find(t => t.name === toolName);
                    const args = toolArgsRaw ? JSON.parse(toolArgsRaw) : {};
                    
                    let result;
                    if (tool) {
                        try {
                            result = await tool.handler(args, context);
                        } catch (e: any) {
                            result = { error: e.message };
                        }
                    } else {
                        result = { error: `Tool ${toolName} no encontrada.` };
                    }

                    decision.toolCalls.push({
                        id: toolCall.id,
                        name: toolName || "unknown",
                        args,
                        result
                    });

                    memory.add({
                        role: "tool",
                        name: toolName,
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    } as any);
                }
                decisions.push(decision);
            } else {
                // No more tool calls, we are done
                decisions.push({
                    thought: assistantMessage.content || "",
                    toolCalls: [],
                    finalAnswer: assistantMessage.content || ""
                });
                break;
            }
        }

        return {
            success: true,
            decisions,
            history: memory.getSummary()
        };
    } catch (error: any) {
        console.error("[LogicToop Agent] Runtime Error:", error);
        return {
            success: false,
            error: error.message,
            decisions
        };
    }
}
