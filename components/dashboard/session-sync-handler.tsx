"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient, PUSHER_CHANNELS, EVENTS } from "@/lib/pusher";

/**
 * STP-P1-7: Session Sync Handler
 * Listens for the USER_UPDATED Pusher event and refreshes the session
 * to reflect changes in kycStatus or role without requiring logout.
 */
export default function SessionSyncHandler() {
    const { data: session, update } = useSession();

    useEffect(() => {
        if (!session?.user?.id) return;

        const pusher = getPusherClient();
        const channelName = PUSHER_CHANNELS.getUserChannel(session.user.id);
        const channel = pusher.subscribe(channelName);

        channel.bind(EVENTS.USER_UPDATED, async (data: any) => {
            console.log("📡 User update detected, refreshing session...", data);
            // This triggers the NextAuth session refresh flow
            await update();
        });

        return () => {
            pusher.unsubscribe(channelName);
        };
    }, [session?.user?.id, update]);

    return null; // Invisible component
}
