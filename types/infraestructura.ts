export type InfraestructuraCategoria =
  | "vialidad"
  | "areas_verdes"
  | "deportivo"
  | "edificaciones"
  | "servicios"
  | "otro";

export type InfraestructuraGeometria = "poligono" | "linea" | "punto";

export type InfraestructuraEstado =
  | "planificado"
  | "en_proyecto"
  | "en_construccion"
  | "construido"
  | "en_mantenimiento";

export interface InfraestructuraItem {
  id: string;
  proyectoId: string;
  nombre: string;
  categoria: InfraestructuraCategoria;
  tipo: string;
  geometriaTipo: InfraestructuraGeometria;
  coordenadas: [number, number][];
  estado: InfraestructuraEstado;
  descripcion?: string;
  superficie?: number;
  longitudM?: number;
  fechaEstimadaFin?: string;
  porcentajeAvance: number;
  fotos?: string[];
  colorPersonalizado?: string;
  orden: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TipoInfra {
  value: string;
  label: string;
  color: string;
  geometriaDefault: InfraestructuraGeometria;
}

export interface CategoriaInfra {
  label: string;
  icon: string;
  tipos: TipoInfra[];
}

export const CATEGORIAS_INFRA: Record<InfraestructuraCategoria, CategoriaInfra> = {
  vialidad: {
    label: "Vialidad",
    icon: "🛣️",
    tipos: [
      { value: "calle_principal", label: "Calle principal", color: "#94a3b8", geometriaDefault: "linea" },
      { value: "calle_secundaria", label: "Calle secundaria", color: "#64748b", geometriaDefault: "linea" },
      { value: "sendero_peatonal", label: "Sendero peatonal", color: "#a78bfa", geometriaDefault: "linea" },
      { value: "ciclovia", label: "Ciclovía", color: "#22d3ee", geometriaDefault: "linea" },
    ],
  },
  areas_verdes: {
    label: "Áreas verdes",
    icon: "🌳",
    tipos: [
      { value: "plaza", label: "Plaza", color: "#22c55e", geometriaDefault: "poligono" },
      { value: "parque", label: "Parque", color: "#16a34a", geometriaDefault: "poligono" },
      { value: "area_verde", label: "Área verde", color: "#4ade80", geometriaDefault: "poligono" },
      { value: "reserva_natural", label: "Reserva natural", color: "#15803d", geometriaDefault: "poligono" },
    ],
  },
  deportivo: {
    label: "Deportivo",
    icon: "⚽",
    tipos: [
      { value: "cancha_futbol", label: "Cancha de fútbol", color: "#86efac", geometriaDefault: "poligono" },
      { value: "cancha_tenis", label: "Cancha de tenis", color: "#bbf7d0", geometriaDefault: "poligono" },
      { value: "cancha_paddle", label: "Cancha de paddle", color: "#a7f3d0", geometriaDefault: "poligono" },
      { value: "campo_golf", label: "Campo de golf", color: "#6ee7b7", geometriaDefault: "poligono" },
      { value: "pileta", label: "Pileta/Piscina", color: "#7dd3fc", geometriaDefault: "poligono" },
    ],
  },
  edificaciones: {
    label: "Edificaciones",
    icon: "🏛️",
    tipos: [
      { value: "masterhouse", label: "Masterhouse/Clubhouse", color: "#60a5fa", geometriaDefault: "poligono" },
      { value: "sum", label: "SUM", color: "#93c5fd", geometriaDefault: "poligono" },
      { value: "area_comercial", label: "Área comercial", color: "#3b82f6", geometriaDefault: "poligono" },
      { value: "porteria", label: "Portería/Acceso", color: "#1d4ed8", geometriaDefault: "punto" },
      { value: "estacionamiento", label: "Estacionamiento", color: "#a5b4fc", geometriaDefault: "poligono" },
    ],
  },
  servicios: {
    label: "Servicios",
    icon: "⚙️",
    tipos: [
      { value: "tanque_agua", label: "Tanque de agua", color: "#94a3b8", geometriaDefault: "punto" },
      { value: "planta_tratamiento", label: "Planta de tratamiento", color: "#475569", geometriaDefault: "punto" },
      { value: "subestacion", label: "Subestación eléctrica", color: "#fbbf24", geometriaDefault: "punto" },
    ],
  },
  otro: {
    label: "Otro",
    icon: "📌",
    tipos: [
      { value: "personalizado", label: "Personalizado", color: "#e2e8f0", geometriaDefault: "poligono" },
    ],
  },
};

export const ESTADO_INFRA_CONFIG: Record<
  InfraestructuraEstado,
  { label: string; color: string; bgColor: string; dashArray?: string }
> = {
  planificado: {
    label: "Planificado",
    color: "#94a3b8",
    bgColor: "bg-slate-500/20 text-slate-400",
    dashArray: "6 4",
  },
  en_proyecto: {
    label: "En proyecto",
    color: "#60a5fa",
    bgColor: "bg-blue-500/20 text-blue-400",
    dashArray: "4 2",
  },
  en_construccion: {
    label: "En construcción",
    color: "#fb923c",
    bgColor: "bg-orange-500/20 text-orange-400",
  },
  construido: {
    label: "Construido",
    color: "#22c55e",
    bgColor: "bg-green-500/20 text-green-400",
  },
  en_mantenimiento: {
    label: "En mantenimiento",
    color: "#fbbf24",
    bgColor: "bg-yellow-500/20 text-yellow-400",
    dashArray: "2 2",
  },
};

export function getInfraCategoryColor(categoria: InfraestructuraCategoria, tipo: string): string {
  const cat = CATEGORIAS_INFRA[categoria];
  if (!cat) return "#94a3b8";
  const t = cat.tipos.find((x) => x.value === tipo);
  return t?.color ?? "#94a3b8";
}
