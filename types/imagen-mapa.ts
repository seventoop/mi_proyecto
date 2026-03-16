export type ImagenMapaTipo = "360" | "foto" | "panoramica";

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
  createdAt: string;
  updatedAt: string;
  // populated if included
  unidad?: { id: string; numero: string } | null;
}

export const IMAGEN_TIPO_CONFIG: Record<
  ImagenMapaTipo,
  { label: string; color: string; emoji: string }
> = {
  "360": { label: "360°", color: "#6366f1", emoji: "🌐" },
  foto: { label: "Fotografía", color: "#10b981", emoji: "📷" },
  panoramica: { label: "Panorámica", color: "#f59e0b", emoji: "🖼️" },
};
