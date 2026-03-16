
import { AnthropicBannerProvider } from "@/lib/banner-ai/providers/anthropic";
import { OpenAIBannerProvider } from "@/lib/banner-ai/providers/openai";
import { BannerAIProvider } from "@/lib/banner-ai/types";

export function getBannerAIProvider(providerId?: string): BannerAIProvider {
  const preferredProvider = (providerId || process.env.BANNER_AI_PROVIDER)?.toLowerCase();
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  // 1. Explicit Choice
  if (preferredProvider === "anthropic" && anthropicKey) {
    return new AnthropicBannerProvider(anthropicKey);
  }
  if (preferredProvider === "openai" && openAIKey) {
    return new OpenAIBannerProvider(openAIKey);
  }

  // 2. Intelligent Fallback (if no explicit choice or key missing for choice)
  if (anthropicKey) {
    return new AnthropicBannerProvider(anthropicKey);
  }
  if (openAIKey) {
    return new OpenAIBannerProvider(openAIKey);
  }

  // 3. No configuration
  throw new Error("No se encontró configuración válida para proveedores de IA (Anthropic o OpenAI).");
}
