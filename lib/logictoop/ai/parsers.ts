import { AIClassificationResult, AIScoreResult, AISummaryResult, AIRouteResult } from "./types";

/**
 * LogicToop V1 AI Response Parsers & Validators
 */

export const Parsers = {
    validateClassification(data: any): AIClassificationResult {
        return {
            leadType: ["BUYER", "INVESTOR", "BROWSER", "UNKNOWN"].includes(data.leadType) ? data.leadType : "UNKNOWN",
            urgency: ["HIGH", "MEDIUM", "LOW"].includes(data.urgency) ? data.urgency : "MEDIUM",
            sentiment: ["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(data.sentiment) ? data.sentiment : "NEUTRAL",
            confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
            summary: String(data.summary || "No se pudo resumir.")
        };
    },

    validateScore(data: any): AIScoreResult {
        return {
            score: typeof data.score === 'number' ? Math.min(100, Math.max(0, data.score)) : 50,
            reasoning: String(data.reasoning || "Sin razonamiento."),
            recommendedAction: String(data.recommendedAction || "Seguimiento estándar.")
        };
    },

    validateSummary(data: any): AISummaryResult {
        return {
            summary: String(data.summary || "No hay resumen."),
            highlights: Array.isArray(data.highlights) ? data.highlights.map(String) : [],
            nextBestStep: String(data.nextBestStep || "Pendiente.")
        };
    },

    validateRoute(data: any): AIRouteResult {
        return {
            routeTo: ["SALES", "INVESTORS", "SUPPORT", "MANUAL_REVIEW"].includes(data.routeTo) ? data.routeTo : "MANUAL_REVIEW",
            confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
            reasoning: String(data.reasoning || "Requiere revisión manual.")
        };
    }
};
