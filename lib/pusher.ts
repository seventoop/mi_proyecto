import Pusher from "pusher";
import PusherClient from "pusher-js";

// ─── Server-side Pusher instance ───
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
    if (!pusherServer) {
        pusherServer = new Pusher({
            appId: process.env.PUSHER_APP_ID || "app-id",
            key: process.env.NEXT_PUBLIC_PUSHER_KEY || "app-key",
            secret: process.env.PUSHER_SECRET || "app-secret",
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
            useTLS: true,
        });
    }
    return pusherServer;
}

// ─── Client-side Pusher instance (singleton) ───
let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherClient) {
        pusherClient = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY || "app-key",
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
            }
        );
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
} as const;
