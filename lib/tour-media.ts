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

export function normalizeTourMediaCategory(input?: {
  category?: string | null;
  masterplanOverlay?: unknown;
} | null): TourMediaCategory {
  const rawCategory = (input?.category || "").toLowerCase();
  const overlay =
    input?.masterplanOverlay && typeof input.masterplanOverlay === "object"
      ? (input.masterplanOverlay as { imageKind?: string | null })
      : null;
  const imageKind = (overlay?.imageKind || "").toLowerCase();

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
  masterplanOverlay?: unknown;
} | null): boolean {
  return normalizeTourMediaCategory(input) === "tour360";
}
