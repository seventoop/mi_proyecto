export type AIProvider = "OPENAI" | "ANTHROPIC";

export interface AIRequestOptions {
    provider?: AIProvider;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}

export interface AIClassificationResult {
    leadType: "BUYER" | "INVESTOR" | "BROWSER" | "UNKNOWN";
    urgency: "HIGH" | "MEDIUM" | "LOW";
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    confidence: number;
    summary: string;
}

export interface AIScoreResult {
    score: number;
    reasoning: string;
    recommendedAction: string;
}

export interface AISummaryResult {
    summary: string;
    highlights: string[];
    nextBestStep: string;
}

export interface AIRouteResult {
    routeTo: "SALES" | "INVESTORS" | "SUPPORT" | "MANUAL_REVIEW";
    confidence: number;
    reasoning: string;
}
