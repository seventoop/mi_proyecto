"use server";

import { requireAnyRole, handleGuardError } from "@/lib/guards";
import { getBannerAIProvider } from "@/lib/banner-ai/factory";
import { BannerAIContent, BannerAIRequest } from "@/lib/banner-ai/types";

export async function generateBannerContent(
    prompt: string,
    mediaType: "IMAGEN" | "VIDEO" = "IMAGEN",
    providerId?: string,
    context?: string
): Promise<{ success: boolean; data?: BannerAIContent; error?: string }> {
    try {
        await requireAnyRole(["ADMIN", "SUPERADMIN", "DESARROLLADOR", "VENDEDOR"]);

        if (!prompt || prompt.trim().length < 10) {
            return { success: false, error: "El prompt debe tener al menos 10 caracteres." };
        }

        const provider = getBannerAIProvider(providerId);
        
        const request: BannerAIRequest = {
            prompt,
            mediaType,
            context
        };

        return await provider.generateContent(request);

    } catch (error: any) {
        if (error?.name === "AuthError") return handleGuardError(error) as any;
        console.error("[banner-ai] Error:", error);
        return { 
            success: false, 
            error: error.message || "Error al generar contenido con IA. Verificá la configuración de proveedores." 
        };
    }
}
