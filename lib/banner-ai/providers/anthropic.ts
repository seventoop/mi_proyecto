
import Anthropic from "@anthropic-ai/sdk";
import { BannerAIProvider, BannerAIRequest, BANNER_AI_SYSTEM_PROMPT, getBannerAIUserPrompt } from "@/lib/banner-ai/types";

export class AnthropicBannerProvider implements BannerAIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateContent(request: BannerAIRequest) {
    const systemPrompt = BANNER_AI_SYSTEM_PROMPT;
    const userPrompt = getBannerAIUserPrompt(request);

    try {
      const message = await this.client.messages.create({
        model: "claude-sonnet-4-0",
        max_tokens: 1500,
        messages: [{ role: "user", content: userPrompt }],
        system: systemPrompt,
      });

      const rawText = message.content[0]?.type === "text" ? message.content[0].text : "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("IA no devolvió JSON válido");

      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, data: parsed };
    } catch (error: any) {
      console.error("[AnthropicProvider] Error:", error);
      return { success: false, error: "Error en Anthropic: " + error.message };
    }
  }
}
