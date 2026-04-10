import type { TourMediaCategory } from "@/lib/tour-media";

export type ImagenMapaTipo = "360" | "foto" | "panoramica" | "render" | "avance";
export type ImagenMapaCategoria = TourMediaCategory;
export type ImagenMapaOrientation = "north" | "south" | "east" | "west" | "center" | null;

export interface ImagenMapaItem {
  id: string;
  proyectoId: string;
  unidadId: string | null;
  url: string;
  tipo: ImagenMapaTipo;
  titulo: string | null;
  lat: number;
  lng: number;
  orden: number;
  altitudM: number | null;
  imageHeading: number | null;
  latOffset: number | null;
  lngOffset: number | null;
  planRotation: number | null;
  planScale: number | null;
  createdAt: string;
  updatedAt: string;
  unidad?: { id: string; numero: string } | null;
}

export const IMAGEN_TIPO_CONFIG: Record<
  ImagenMapaTipo,
  { label: string; color: string; emoji: string }
> = {
  "360": { label: "360°", color: "#6366f1", emoji: "🌐" },
  foto: { label: "Imágenes reales", color: "#0ea5e9", emoji: "📷" },
  panoramica: { label: "Panorámica (legacy)", color: "#6366f1", emoji: "🌐" },
  render: { label: "Imágenes render", color: "#8b5cf6", emoji: "✨" },
  avance: { label: "Avance de obra", color: "#f59e0b", emoji: "🏗️" },
};

export const IMAGEN_CATEGORIA_CONFIG: Record<
  ImagenMapaCategoria,
  { label: string; shortLabel: string; color: string; emoji: string }
> = {
  tour360: { label: "360 / Panorámica", shortLabel: "360°", color: "#6366f1", emoji: "🌐" },
  real: { label: "Imágenes reales", shortLabel: "Real", color: "#0ea5e9", emoji: "📷" },
  render: { label: "Imágenes render", shortLabel: "Render", color: "#8b5cf6", emoji: "✨" },
  avance: { label: "Avance de obra", shortLabel: "Avance", color: "#f59e0b", emoji: "🏗️" },
};

const ORIENTATION_PATTERNS: Array<{
  orientation: Exclude<ImagenMapaOrientation, null>;
  pattern: RegExp;
  label: string;
}> = [
  { orientation: "north", pattern: /\b(norte|north)\b/i, label: "Norte" },
  { orientation: "south", pattern: /\b(sur|south)\b/i, label: "Sur" },
  { orientation: "east", pattern: /\b(este|east)\b/i, label: "Este" },
  { orientation: "west", pattern: /\b(oeste|west)\b/i, label: "Oeste" },
  { orientation: "center", pattern: /\b(centro|center|central)\b/i, label: "Centro" },
];

export function normalizeImagenMapaCategory(tipo?: string | null): ImagenMapaCategoria {
  switch ((tipo || "").toLowerCase()) {
    case "360":
    case "panoramica":
      return "tour360";
    case "render":
      return "render";
    case "avance":
      return "avance";
    case "foto":
    default:
      return "real";
  }
}

export function categoryToImagenMapaTipo(category: ImagenMapaCategoria): ImagenMapaTipo {
  switch (category) {
    case "tour360":
      return "360";
    case "render":
      return "render";
    case "avance":
      return "avance";
    case "real":
    default:
      return "foto";
  }
}

export function isImagenMapa360Like(tipo?: string | null): boolean {
  const normalized = (tipo || "").toLowerCase();
  return normalized === "360" || normalized === "panoramica";
}

export function normalizeImagenMapaTipoForWrite(tipo?: string | null): ImagenMapaTipo {
  const normalized = (tipo || "").toLowerCase();
  if (normalized === "panoramica") return "360";
  if (normalized === "render") return "render";
  if (normalized === "avance") return "avance";
  if (normalized === "360") return "360";
  return "foto";
}

// Preparación interna para una futura vinculación semántica entre módulos.
// Por ahora no se persiste ni participa del flujo real de guardado/relación.
export function inferImagenOrientation(title?: string | null): {
  orientation: ImagenMapaOrientation;
  label: string | null;
} {
  const value = (title || "").trim();
  for (const entry of ORIENTATION_PATTERNS) {
    if (entry.pattern.test(value)) {
      return { orientation: entry.orientation, label: entry.label };
    }
  }
  return { orientation: null, label: null };
}

// Preparación interna para una futura vinculación semántica entre módulos.
// Por ahora no se persiste ni participa del flujo real de guardado/relación.
export function buildImagenSemanticKey(input: {
  title?: string | null;
  tipo?: string | null;
}) {
  const cleanedTitle = (input.title || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const category = normalizeImagenMapaCategory(input.tipo);
  const orientation = inferImagenOrientation(input.title).orientation ?? "unspecified";
  return `${category}:${orientation}:${cleanedTitle || "sin-titulo"}`;
}
