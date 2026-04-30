export type TourMediaCategory = "tour360" | "real" | "render" | "avance";

export type StoredTourSceneCategory =
  | "RAW"
  | "RENDERED"
  | "TOUR360"
  | "REAL"
  | "RENDER"
  | "AVANCE";

export const TOUR_MEDIA_CATEGORY_LABELS: Record<TourMediaCategory, string> = {
  tour360: "360 / Panorámicas",
  real: "Imágenes reales",
  render: "Imágenes render",
  avance: "Avance de obra",
};

export const TOUR_MEDIA_CATEGORY_SHORT_LABELS: Record<TourMediaCategory, string> = {
  tour360: "360°",
  real: "Real",
  render: "Render",
  avance: "Avance",
};

export const TOUR_MEDIA_CATEGORY_BADGE_STYLES: Record<TourMediaCategory, string> = {
  tour360: "bg-brand-500",
  real: "bg-sky-500",
  render: "bg-indigo-500",
  avance: "bg-amber-500",
};

export type GalleryCategory =
  | "MASTERPLAN"
  | "EXTERIOR"
  | "INTERIOR"
  | "RENDER"
  | "AVANCE_OBRA";

export const GALLERY_CATEGORIES = [
  "MASTERPLAN",
  "EXTERIOR",
  "INTERIOR",
  "RENDER",
  "AVANCE_OBRA",
] as const;

export const DEFAULT_GALLERY_CATEGORY: GalleryCategory = "EXTERIOR";

const GALLERY_TO_SCENE_CATEGORY: Record<GalleryCategory, TourMediaCategory> = {
  MASTERPLAN: "tour360",
  EXTERIOR: "real",
  INTERIOR: "real",
  RENDER: "render",
  AVANCE_OBRA: "avance",
};

export function normalizeGalleryCategory(raw?: string | null): GalleryCategory {
  if (!raw) {
    return DEFAULT_GALLERY_CATEGORY;
  }

  const normalized = String(raw).trim().toUpperCase();
  return GALLERY_CATEGORIES.includes(normalized as GalleryCategory)
    ? (normalized as GalleryCategory)
    : DEFAULT_GALLERY_CATEGORY;
}

export function galleryCategoryToSceneCategory(raw?: string | null): TourMediaCategory {
  return GALLERY_TO_SCENE_CATEGORY[normalizeGalleryCategory(raw)];
}

export function sceneCategoryToGalleryCategory(
  raw?: string | null,
  fallback: string | GalleryCategory = DEFAULT_GALLERY_CATEGORY
): GalleryCategory {
  const normalizedSceneCategory = String(raw || "").trim().toLowerCase();

  if (normalizedSceneCategory === "tour360") return "MASTERPLAN";
  if (normalizedSceneCategory === "real") return "EXTERIOR";
  if (normalizedSceneCategory === "rendered") return "RENDER";
  if (normalizedSceneCategory === "render") return "RENDER";
  if (normalizedSceneCategory === "avance") return "AVANCE_OBRA";
  if (normalizedSceneCategory === "raw") return "EXTERIOR";

  return normalizeGalleryCategory(fallback as string | null);
}

export function normalizeTourMediaCategory(input?: {
  category?: string | null;
  masterplanOverlay?: { imageKind?: string | null } | null;
} | null): TourMediaCategory {
  const rawCategory = (input?.category || "").toLowerCase();
  const imageKind = (input?.masterplanOverlay?.imageKind || "").toLowerCase();

  if (rawCategory === "tour360") return "tour360";
  if (rawCategory === "real") return "real";
  if (rawCategory === "render") return "render";
  if (rawCategory === "avance") return "avance";

  // Backward compatibility with the previous 2-tab model.
  if (rawCategory === "rendered") return "render";
  if (rawCategory === "raw") {
    if (imageKind === "foto") return "real";
    return "tour360";
  }

  if (imageKind === "foto") return "real";
  if (imageKind === "360" || imageKind === "panoramica") return "tour360";

  return "tour360";
}

export function toStoredTourSceneCategory(category?: string | null): StoredTourSceneCategory {
  const normalized = normalizeTourMediaCategory({ category });
  switch (normalized) {
    case "real":
      return "REAL";
    case "render":
      return "RENDER";
    case "avance":
      return "AVANCE";
    default:
      return "TOUR360";
  }
}

export function isTour360Category(input?: {
  category?: string | null;
  masterplanOverlay?: { imageKind?: string | null } | null;
} | null): boolean {
  return normalizeTourMediaCategory(input) === "tour360";
}
