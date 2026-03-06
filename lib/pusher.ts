import Pusher from "pusher";
import PusherClient from "pusher-js";

// ─── Server-side Pusher instance ───
let pusherServer: Pusher | null = null;

const isInvalid = (val: string | undefined) => !val || val === "..." || val.includes("your-") || val.includes("sk-");

export function getPusherServer(): Pusher | null {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (isInvalid(appId) || isInvalid(key) || isInvalid(secret)) {
        console.warn("Pusher Server configuration is missing or invalid.");
        return null;
    }

    if (!pusherServer) {
        pusherServer = new Pusher({
            appId: appId!,
            key: key!,
            secret: secret!,
            cluster: cluster || "us2",
            useTLS: true,
        });
    }
    return pusherServer;
}

// ─── Client-side Pusher instance (singleton) ───
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (isInvalid(key)) {
        return null;
    }

    if (!pusherClient) {
        try {
            pusherClient = new PusherClient(key!, {
                cluster: cluster || "us2",
                enabledTransports: ['ws', 'wss'], // Prefer WebSockets to avoid XHR streaming errors if possible
            });
        } catch (error) {
            console.error("Failed to initialize Pusher Client:", error);
            return null;
        }
    }
    return pusherClient;
}

// ─── Channel Names ───
export const CHANNELS = {
    RESERVAS: "reservas",
    UNIDADES: "unidades",
} as const;

// ─── Event Names ───
export const EVENTS = {
    RESERVA_CREATED: "reserva:created",
    RESERVA_UPDATED: "reserva:updated",
    RESERVA_EXPIRED: "reserva:expired",
    RESERVA_CANCELLED: "reserva:cancelled",
    RESERVA_CONVERTED: "reserva:converted",
    UNIDAD_STATUS_CHANGED: "unidad:status-changed",
    NOTIFICATION_NEW: "new-notification",
    USER_UPDATED: "user:updated",
} as const;

export const PUSHER_CHANNELS = {
    getUserChannel: (userId: string) => `private-user-${userId}-notifications`,
    getProjectChannel: (projectId: string) => `private-project-${projectId}`,
};
