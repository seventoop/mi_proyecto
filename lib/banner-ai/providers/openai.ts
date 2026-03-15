
import OpenAI from "openai";
import { BannerAIProvider, BannerAIRequest, BANNER_AI_SYSTEM_PROMPT, getBannerAIUserPrompt } from "@/lib/banner-ai/types";

export class OpenAIBannerProvider implements BannerAIProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateContent(request: BannerAIRequest) {
    const systemPrompt = BANNER_AI_SYSTEM_PROMPT;
    const userPrompt = getBannerAIUserPrompt(request);

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });

      const rawText = completion.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawText);
      return { success: true, data: parsed };
    } catch (error: any) {
      console.error("[OpenAIProvider] Error:", error);
      return { success: false, error: "Error en OpenAI: " + error.message };
    }
  }
}
