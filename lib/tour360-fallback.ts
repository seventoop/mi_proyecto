import fs from "fs";
import path from "path";

import type { Scene } from "@/components/tour360/tour-viewer";
import type { SceneOverlayCalibration } from "@/lib/tour-overlay";
import { DEFAULT_SCENE_OVERLAY } from "@/lib/tour-overlay";

type FallbackProjectLike = {
  id: string;
  nombre?: string | null;
  slug?: string | null;
  planGallery?: string | null;
};

type PlanGalleryItem = {
  id?: string;
  imageUrl?: string;
  nombre?: string;
  tipo?: string;
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getProjectTokens(project: FallbackProjectLike): string[] {
  const source = [project.nombre || "", project.slug || ""]
    .map(normalizeToken)
    .join(" ");

  const stopwords = new Set([
    "del",
    "de",
    "la",
    "el",
    "los",
    "las",
    "virrey",
    "barrio",
    "proyecto",
  ]);

  return Array.from(
    new Set(
      source
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !stopwords.has(token))
    )
  );
}

function parsePlanGallery(raw?: string | null): PlanGalleryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getProjectOverlayPreset(project: FallbackProjectLike): SceneOverlayCalibration | null {
  const normalized = normalizeToken(`${project.nombre || ""} ${project.slug || ""}`);

  if (normalized.includes("valles") && normalized.includes("pino")) {
    return {
      ...DEFAULT_SCENE_OVERLAY,
      altitudM: 1045,
      imageHeading: 347,
      latOffset: -474,
      lngOffset: 7892,
      planRotation: 52,
      planScale: 1,
      planScaleX: 1,
      planScaleY: 1,
      opacity: 0.55,
      showLabels: false,
      showPerimeter: true,
      cleanMode: false,
      alignmentGuides: true,
    };
  }

  return null;
}

function findLocalTour360Image(project: FallbackProjectLike): string | null {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "360");
  if (!fs.existsSync(uploadsDir)) return null;

  const tokens = getProjectTokens(project);
  if (tokens.length === 0) return null;

  const entries = fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const fullPath = path.join(uploadsDir, entry.name);
      const stats = fs.statSync(fullPath);
      return {
        name: entry.name,
        normalized: normalizeToken(entry.name),
        mtimeMs: stats.mtimeMs,
      };
    })
    .filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry.name));

  const matches = entries
    .map((entry) => ({
      ...entry,
      score: tokens.reduce((acc, token) => acc + (entry.normalized.includes(token) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);

  return matches.length > 0 ? `/uploads/360/${matches[0].name}` : null;
}

export function buildFallbackTour360Scenes(project: FallbackProjectLike): Scene[] {
  const imageUrl = findLocalTour360Image(project);
  if (!imageUrl) return [];

  const plan = parsePlanGallery(project.planGallery)[0];
  const preset = {
    ...DEFAULT_SCENE_OVERLAY,
    ...(getProjectOverlayPreset(project) || {}),
  };

  return [
    {
      id: `fallback-tour360-${project.id}`,
      title: project.nombre ? `${project.nombre} 360` : "Tour 360",
      imageUrl,
      thumbnailUrl: imageUrl,
      hotspots: [],
      polygons: [],
      floatingLabels: [],
      isDefault: true,
      order: 0,
      category: "tour360",
      masterplanOverlay: {
        ...DEFAULT_SCENE_OVERLAY,
        ...preset,
        imageKind: "360",
        selectedPlanId: plan?.id,
        imageUrl: plan?.imageUrl || undefined,
      },
    },
  ];
}
