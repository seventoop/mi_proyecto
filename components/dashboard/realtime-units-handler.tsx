"use client";

import { useEffect } from "react";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher";
import { useMasterplanStore } from "@/lib/masterplan-store";

export default function RealtimeUnitsHandler() {
    const updateUnitState = useMasterplanStore((state) => state.updateUnitState);

    useEffect(() => {
        const pusher = getPusherClient();
        const channel = pusher.subscribe(CHANNELS.UNIDADES);

        channel.bind(EVENTS.UNIDAD_STATUS_CHANGED, (data: { id: string; estado: string; proyectoId?: string }) => {
            // updateUnitState ignores the update if the unit id is not currently in the store.
            // This safely keeps the Zustand store updated from anywhere in the app without refreshing.
            updateUnitState(data.id, { estado: data.estado as any });
        });

        return () => {
            channel.unbind(EVENTS.UNIDAD_STATUS_CHANGED);
            pusher.unsubscribe(CHANNELS.UNIDADES);
        };
    }, [updateUnitState]);

    return null;
}
