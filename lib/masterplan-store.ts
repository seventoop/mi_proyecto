import { create } from "zustand";

// ─── Types ───
export interface MasterplanUnit {
    id: string;
    numero: string;
    tipo: "LOTE" | "DEPARTAMENTO";
    superficie: number | null;
    frente: number | null;
    fondo: number | null;
    esEsquina: boolean;
    orientacion: string | null;
    precio: number | null;
    moneda: string;
    estado: "DISPONIBLE" | "BLOQUEADO" | "RESERVADO" | "VENDIDO";
    etapaId: string;
    etapaNombre: string;
    manzanaId: string;
    manzanaNombre: string;
    tour360Url: string | null;
    imagenes: string[];
    responsable: string | null;
    // SVG shape data
    path: string; // SVG path d attribute or polygon points
    cx: number;   // center X for label
    cy: number;   // center Y for label
}

export interface MasterplanLayer {
    id: string;
    label: string;
    icon: string;
    visible: boolean;
    color: string;
}

export interface MasterplanFilters {
    estado: string[];
    etapaId: string | null;
    manzanaId: string | null;
    precioMin: number | null;
    precioMax: number | null;
    superficieMin: number | null;
    superficieMax: number | null;
    soloEsquina: boolean;
}

const defaultFilters: MasterplanFilters = {
    estado: [],
    etapaId: null,
    manzanaId: null,
    precioMin: null,
    precioMax: null,
    superficieMin: null,
    superficieMax: null,
    soloEsquina: false,
};

interface MasterplanState {
    // Units data
    units: MasterplanUnit[];
    setUnits: (units: MasterplanUnit[]) => void;

    // Selection
    selectedUnitId: string | null;
    setSelectedUnitId: (id: string | null) => void;

    // Hover
    hoveredUnitId: string | null;
    setHoveredUnitId: (id: string | null) => void;

    // Comparison
    comparisonIds: string[];
    toggleComparison: (id: string) => void;
    clearComparison: () => void;
    showComparator: boolean;
    setShowComparator: (show: boolean) => void;

    // Filters
    filters: MasterplanFilters;
    setFilter: <K extends keyof MasterplanFilters>(key: K, value: MasterplanFilters[K]) => void;
    resetFilters: () => void;
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;

    // Layers
    layers: MasterplanLayer[];
    setLayers: (layers: MasterplanLayer[]) => void;
    toggleLayer: (id: string) => void;

    // View
    zoom: number;
    setZoom: (zoom: number) => void;
}

export const useMasterplanStore = create<MasterplanState>((set) => ({
    // Units
    units: [],
    setUnits: (units) => set({ units }),

    // Selection
    selectedUnitId: null,
    setSelectedUnitId: (id) => set({ selectedUnitId: id }),

    // Hover
    hoveredUnitId: null,
    setHoveredUnitId: (id) => set({ hoveredUnitId: id }),

    // Comparison
    comparisonIds: [],
    toggleComparison: (id) =>
        set((state) => {
            if (state.comparisonIds.includes(id)) {
                return { comparisonIds: state.comparisonIds.filter((i) => i !== id) };
            }
            if (state.comparisonIds.length >= 4) return state; // max 4
            return { comparisonIds: [...state.comparisonIds, id] };
        }),
    clearComparison: () => set({ comparisonIds: [], showComparator: false }),
    showComparator: false,
    setShowComparator: (show) => set({ showComparator: show }),

    // Filters
    filters: { ...defaultFilters },
    setFilter: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),
    resetFilters: () => set({ filters: { ...defaultFilters } }),
    showFilters: false,
    setShowFilters: (show) => set({ showFilters: show }),

    // Layers
    layers: [
        { id: "servicios", label: "Servicios (agua, luz, gas)", icon: "⚡", visible: true, color: "#3b82f6" },
        { id: "amenities", label: "Amenities", icon: "🏊", visible: true, color: "#8b5cf6" },
        { id: "accesos", label: "Accesos", icon: "🚗", visible: true, color: "#f59e0b" },
        { id: "reglamento", label: "Reglamento de construcción", icon: "📋", visible: false, color: "#64748b" },
    ],
    setLayers: (layers) => set({ layers }),
    toggleLayer: (id) =>
        set((state) => ({
            layers: state.layers.map((l) =>
                l.id === id ? { ...l, visible: !l.visible } : l
            ),
        })),

    // View
    zoom: 1,
    setZoom: (zoom) => set({ zoom }),
}));

// ─── Selector for filtered units ───
export function useFilteredUnits(): MasterplanUnit[] {
    const units = useMasterplanStore((s) => s.units);
    const filters = useMasterplanStore((s) => s.filters);

    return units.filter((u) => {
        if (filters.estado.length > 0 && !filters.estado.includes(u.estado)) return false;
        if (filters.etapaId && u.etapaId !== filters.etapaId) return false;
        if (filters.manzanaId && u.manzanaId !== filters.manzanaId) return false;
        if (filters.precioMin != null && (u.precio || 0) < filters.precioMin) return false;
        if (filters.precioMax != null && (u.precio || 0) > filters.precioMax) return false;
        if (filters.superficieMin != null && (u.superficie || 0) < filters.superficieMin) return false;
        if (filters.superficieMax != null && (u.superficie || 0) > filters.superficieMax) return false;
        if (filters.soloEsquina && !u.esEsquina) return false;
        return true;
    });
}
