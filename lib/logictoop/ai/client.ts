import OpenAI from "openai";
import { getSystemConfig } from "@/lib/actions/configuration";
import { AIRequestOptions } from "./types";

/**
 * LogicToop Central AI Client
 */
export async function callAI(prompt: string, systemPrompt: string, options: AIRequestOptions = {}) {
    const { 
        model = "gpt-4o-mini", 
        temperature = 0.5, 
        maxTokens = 500, 
        jsonMode = true 
    } = options;

    try {
        const configRes = await getSystemConfig("OPENAI_API_KEY");
        const apiKey = configRes.value || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error("OpenAI API Key no configurada.");
        }

        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: jsonMode ? { type: "json_object" } : undefined,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error("Respuesta vacía de AI.");

        return jsonMode ? JSON.parse(content) : content;
    } catch (error) {
        console.error("[LogicToop AI] Error calling LLM:", error);
        throw error;
    }
}
