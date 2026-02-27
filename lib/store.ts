import { create } from "zustand";

interface AppState {
    // Sidebar
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;

    // Filtros activos
    activeProjectFilter: string | null;
    setActiveProjectFilter: (projectId: string | null) => void;

    // Vista de masterplan
    masterplanZoom: number;
    setMasterplanZoom: (zoom: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // Sidebar
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Filtros
    activeProjectFilter: null,
    setActiveProjectFilter: (projectId) =>
        set({ activeProjectFilter: projectId }),

    // Masterplan
    masterplanZoom: 1,
    setMasterplanZoom: (zoom) => set({ masterplanZoom: zoom }),
}));
