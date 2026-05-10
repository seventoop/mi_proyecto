import { sanitizePaperclipMetadata } from "./paperclip-security";

export type PaperclipWebhookEventType = 
    | "PAPERCLIP_RUN_ACCEPTED" 
    | "PAPERCLIP_RUN_COMPLETED" 
    | "PAPERCLIP_RUN_FAILED" 
    | "PAPERCLIP_RUN_NEEDS_APPROVAL";

export interface PreviewPaperclipWebhookEventParams {
    eventType: PaperclipWebhookEventType;
    taskId: string;
    orgId: string;
    paperclipRunId?: string;
    status?: string;
    metadata?: Record<string, any>;
}

export interface PreviewPaperclipWebhookEventResult {
    success: boolean;
    eventType: PaperclipWebhookEventType;
    wouldRecordAiEventType?: string;
    wouldUpdateTaskStatus?: boolean;
    wouldSetPaperclipRunId?: boolean;
    wouldRequireHumanApproval?: boolean;
    sideEffects: false;
    dbMutation: false;
    message: string;
    sanitizedMetadata?: Record<string, any>;
}

export function previewPaperclipWebhookEvent(params: PreviewPaperclipWebhookEventParams): PreviewPaperclipWebhookEventResult {
    const { eventType, taskId, orgId, paperclipRunId, metadata } = params;
    
    // Always sanitize metadata first to ensure no leaks
    const sanitizedMetadata = sanitizePaperclipMetadata(metadata || {});

    const baseResult: PreviewPaperclipWebhookEventResult = {
        success: true,
        eventType,
        sideEffects: false,
        dbMutation: false,
        message: `Dry-run mapped event type: ${eventType}`,
        sanitizedMetadata
    };

    switch (eventType) {
        case "PAPERCLIP_RUN_ACCEPTED":
            return {
                ...baseResult,
                wouldRecordAiEventType: "PAPERCLIP_RUN_ACCEPTED",
                wouldSetPaperclipRunId: true,
                wouldUpdateTaskStatus: false
            };
        case "PAPERCLIP_RUN_COMPLETED":
            return {
                ...baseResult,
                wouldRecordAiEventType: "PAPERCLIP_RUN_COMPLETED",
                wouldUpdateTaskStatus: false, // In this phase we don't update status directly
                wouldRequireHumanApproval: true // Output requires future human approval
            };
        case "PAPERCLIP_RUN_FAILED":
            return {
                ...baseResult,
                wouldRecordAiEventType: "PAPERCLIP_RUN_FAILED",
                wouldUpdateTaskStatus: false
            };
        case "PAPERCLIP_RUN_NEEDS_APPROVAL":
            return {
                ...baseResult,
                wouldRecordAiEventType: "PAPERCLIP_RUN_NEEDS_APPROVAL",
                wouldRequireHumanApproval: true,
                wouldUpdateTaskStatus: false
            };
        default:
            return {
                ...baseResult,
                success: false,
                message: `Unknown or unmapped event type: ${eventType}`
            };
    }
}
