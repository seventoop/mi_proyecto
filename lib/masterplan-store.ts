import { NORMALIZED_UNIT_ESTADO } from "@/lib/public-projects";
import { create } from "zustand";

// ─── Types ───
export interface MasterplanUnit {
    id: string;
    numero: string;
    tipo: string;
    superficie: number | null;
    frente: number | null;
    fondo: number | null;
    esEsquina: boolean;
    orientacion: string | null;
    precio: number | null;
    moneda: string;
    estado:
        | typeof NORMALIZED_UNIT_ESTADO.DISPONIBLE
        | typeof NORMALIZED_UNIT_ESTADO.BLOQUEADA
        | typeof NORMALIZED_UNIT_ESTADO.RESERVADA
        | typeof NORMALIZED_UNIT_ESTADO.VENDIDA
        | typeof NORMALIZED_UNIT_ESTADO.SUSPENDIDO;
    etapaId?: string;
    etapaNombre?: string;
    manzanaId?: string;
    manzanaNombre?: string;
    tour360Url?: string | null;
    imagenes?: string[];
    responsable?: string | null;
    // Geometric data (usually stored as JSON in coordenadasMasterplan)
    path?: string;
    cx?: number;
    cy?: number;
    geoJSON?: string | null;
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
    tipo: string[];
    precioMin: number | null;
    precioMax: number | null;
    superficieMin: number | null;
    superficieMax: number | null;
    soloEsquina: boolean;
}

const defaultFilters: MasterplanFilters = {
    estado: [],
    tipo: [],
    precioMin: null,
    precioMax: null,
    superficieMin: null,
    superficieMax: null,
    soloEsquina: false,
};

interface MasterplanState {
    // Units data (Single Source of Truth)
    units: MasterplanUnit[];
    setUnits: (units: MasterplanUnit[]) => void;
    updateUnitState: (unitId: string, partial: Partial<MasterplanUnit>) => void;

    // Selection & UI State
    selectedUnitId: string | null;
    setSelectedUnitId: (id: string | null) => void;
    activePanel: "lot" | "imagenes" | "infraestructura" | null;
    setActivePanel: (panel: "lot" | "imagenes" | "infraestructura" | null) => void;
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
    toggleLayer: (id: string) => void;

    // View
    zoom: number;
    setZoom: (zoom: number) => void;
}

export const useMasterplanStore = create<MasterplanState>((set) => ({
    // Units
    units: [],
    setUnits: (units) => set({ units }),
    updateUnitState: (unitId, partial) =>
        set((state) => ({
            units: state.units.map(u => u.id === unitId ? { ...u, ...partial } : u)
        })),

    // Selection
    selectedUnitId: null,
    activePanel: null,
    setSelectedUnitId: (id) =>
        set((state) => ({
            selectedUnitId: id,
            activePanel: id ? "lot" : state.activePanel === "lot" ? null : state.activePanel,
        })),
    setActivePanel: (panel) =>
        set((state) => ({
            activePanel: panel,
            selectedUnitId: panel === "lot" ? state.selectedUnitId : null,
        })),

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
            if (state.comparisonIds.length >= 4) return state;
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
        { id: "servicios", label: "Servicios", icon: "⚡", visible: true, color: "#3b82f6" },
        { id: "amenities", label: "Amenities", icon: "🏊", visible: true, color: "#8b5cf6" },
        { id: "accesos", label: "Accesos", icon: "🚗", visible: true, color: "#f59e0b" },
    ],
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

// ─── Selectors (Optimized performance) ───
export const selectUnits = (state: MasterplanState) => state.units;
export const selectFilters = (state: MasterplanState) => state.filters;

export function useFilteredUnits(): MasterplanUnit[] {
    const units = useMasterplanStore(selectUnits);
    const filters = useMasterplanStore(selectFilters);

    return units.filter((u) => {
        if (filters.estado.length > 0 && !filters.estado.includes(u.estado)) return false;
        if (filters.tipo.length > 0 && !filters.tipo.includes(u.tipo)) return false;
        if (filters.precioMin != null && (u.precio || 0) < filters.precioMin) return false;
        if (filters.precioMax != null && (u.precio || 0) > filters.precioMax) return false;
        if (filters.superficieMin != null && (u.superficie || 0) < filters.superficieMin) return false;
        if (filters.superficieMax != null && (u.superficie || 0) > filters.superficieMax) return false;
        if (filters.soloEsquina && !u.esEsquina) return false;
        return true;
    });
}
