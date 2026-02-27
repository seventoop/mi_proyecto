"use client";

import { create } from "zustand";

// ─── Types ───
export type EstadoReservaTab = "ACTIVA" | "VENCIDA" | "CONVERTIDA" | "CANCELADA";

export interface ReservaRow {
    id: string;
    unidadNumero: string;
    proyectoNombre: string;
    clienteNombre: string;
    vendedorNombre: string;
    fechaInicio: string;
    fechaVencimiento: string;
    montoSena: number | null;
    estadoPago: "PENDIENTE" | "PAGADO";
    estado: EstadoReservaTab;
    leadId: string;
    unidadId: string;
}

export interface ReservaFilters {
    proyecto: string;
    vendedor: string;
    estadoPago: string;
    search: string;
}

interface ReservaStoreState {
    // Tabs
    activeTab: EstadoReservaTab;
    setActiveTab: (tab: EstadoReservaTab) => void;

    // Filters
    filters: ReservaFilters;
    setFilter: (key: keyof ReservaFilters, value: string) => void;
    clearFilters: () => void;

    // Nueva reserva modal
    showNuevaReserva: boolean;
    setShowNuevaReserva: (v: boolean) => void;
    preselectedUnitId: string | null;
    setPreselectedUnitId: (id: string | null) => void;

    // Optimistic updates
    optimisticUpdates: Map<string, Partial<ReservaRow>>;
    addOptimisticUpdate: (id: string, changes: Partial<ReservaRow>) => void;
    clearOptimisticUpdate: (id: string) => void;
}

const defaultFilters: ReservaFilters = {
    proyecto: "",
    vendedor: "",
    estadoPago: "",
    search: "",
};

export const useReservaStore = create<ReservaStoreState>((set) => ({
    activeTab: "ACTIVA",
    setActiveTab: (tab) => set({ activeTab: tab }),

    filters: { ...defaultFilters },
    setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
    clearFilters: () => set({ filters: { ...defaultFilters } }),

    showNuevaReserva: false,
    setShowNuevaReserva: (v) => set({ showNuevaReserva: v }),
    preselectedUnitId: null,
    setPreselectedUnitId: (id) => set({ preselectedUnitId: id }),

    optimisticUpdates: new Map(),
    addOptimisticUpdate: (id, changes) =>
        set((s) => {
            const next = new Map(s.optimisticUpdates);
            next.set(id, { ...(next.get(id) || {}), ...changes });
            return { optimisticUpdates: next };
        }),
    clearOptimisticUpdate: (id) =>
        set((s) => {
            const next = new Map(s.optimisticUpdates);
            next.delete(id);
            return { optimisticUpdates: next };
        }),
}));
