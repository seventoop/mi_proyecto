export interface OverlayGuideMarkPoint {
  x: number;
  y: number;
}

export interface OverlayCornerAdjustment {
  x: number;
  y: number;
}

export const TOUR_OVERLAY_CONTROL_POINT_COUNT = 4;

export interface OverlayGuideMark {
  id: string;
  type: "line" | "rect" | "zone";
  points: OverlayGuideMarkPoint[];
  color?: string;
}

export interface SceneOverlayCalibration {
  mode?: "geo-calibrated" | "manual";
  isVisible?: boolean;
  opacity?: number;
  altitudM?: number;
  imageHeading?: number;
  latOffset?: number;
  lngOffset?: number;
  planRotation?: number;
  planScale?: number;
  /**
   * Independent East-West scale multiplier applied in geo-space before rotation.
   * Combined with planScale: effectiveScaleX = planScale * planScaleX.
   * Values > 1 stretch the plan east-west; < 1 compress it.
   * Corrects aspect-ratio mismatch between the SVG viewBox and the geographic bounds.
   */
  planScaleX?: number;
  /**
   * Independent North-South scale multiplier applied in geo-space before rotation.
   * Combined with planScale: effectiveScaleY = planScale * planScaleY.
   * Values > 1 stretch the plan north-south; < 1 compress it.
   */
  planScaleY?: number;
  /** @deprecated Screen-space pitch offset — kept for backward compat, not exposed in UI. */
  pitchBias?: number;
  /** @deprecated Screen-space roll correction — kept for backward compat, not exposed in UI. */
  cameraRoll?: number;
  showLabels?: boolean;
  showPerimeter?: boolean;
  cleanMode?: boolean;
  transformLocked?: boolean;
  snapEnabled?: boolean;
  alignmentGuides?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  planCornerAdjustments?: OverlayCornerAdjustment[];
  /** Absolute spherical coordinates (pitch/yaw) for each corner. Use for 'manual' mode. */
  planCornersAbsolute?: { pitch: number; yaw: number }[];
  marks?: OverlayGuideMark[];
  // Added common optional fields for editor/persistence compatibility
  imageUrl?: string;
  selectedPlanId?: string;
  canvasState?: any;
  direction?: any;
  assetVersion?: any;
  originalSceneId?: string;
  hasOverlayEdits?: boolean;
  sceneKey?: string;
  imageKind?: "360" | "foto" | "panoramica";
}

export interface NormalizedSceneOverlayCalibration {
  mode: "geo-calibrated" | "manual";
  isVisible: boolean;
  opacity: number;
  altitudM: number;
  imageHeading: number;
  latOffset: number;
  lngOffset: number;
  planRotation: number;
  planScale: number;
  planScaleX: number;
  planScaleY: number;
  pitchBias: number;
  cameraRoll: number;
  showLabels: boolean;
  showPerimeter: boolean;
  cleanMode: boolean;
  transformLocked: boolean;
  snapEnabled: boolean;
  alignmentGuides: boolean;
  flipX: boolean;
  flipY: boolean;
  planCornerAdjustments: OverlayCornerAdjustment[];
  planCornersAbsolute: { pitch: number; yaw: number }[];
  marks: OverlayGuideMark[];
  // Added common optional fields for editor/persistence compatibility
  imageUrl?: string;
  selectedPlanId?: string;
  canvasState?: any;
  direction?: any;
  assetVersion?: any;
  originalSceneId?: string;
  hasOverlayEdits?: boolean;
  sceneKey?: string;
  imageKind?: "360" | "foto" | "panoramica";
}

export const DEFAULT_SCENE_OVERLAY: NormalizedSceneOverlayCalibration = {
  mode: "geo-calibrated",
  isVisible: true,
  opacity: 0.55,
  altitudM: 500,
  imageHeading: 0,
  latOffset: 0,
  lngOffset: 0,
  planRotation: 0,
  planScale: 1,
  planScaleX: 1,
  planScaleY: 1,
  pitchBias: 0,
  cameraRoll: 0,
  showLabels: true,
  showPerimeter: true,
  cleanMode: false,
  transformLocked: false,
  snapEnabled: false,
  alignmentGuides: true,
  flipX: false,
  flipY: false,
  planCornerAdjustments: [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  planCornersAbsolute: [],
  marks: [],
};

function normalizeCornerAdjustments(
  adjustments?: OverlayCornerAdjustment[] | null
): OverlayCornerAdjustment[] {
  if (!Array.isArray(adjustments) || adjustments.length !== TOUR_OVERLAY_CONTROL_POINT_COUNT) {
    return Array.from({ length: TOUR_OVERLAY_CONTROL_POINT_COUNT }, () => ({ x: 0, y: 0 }));
  }
  return Array.from({ length: TOUR_OVERLAY_CONTROL_POINT_COUNT }, (_, index) => ({
    x: adjustments?.[index]?.x ?? 0,
    y: adjustments?.[index]?.y ?? 0,
  }));
}

export function normalizeSceneOverlay(
  overlay?: SceneOverlayCalibration | null
): NormalizedSceneOverlayCalibration {
  const base = {
    ...DEFAULT_SCENE_OVERLAY,
    ...(overlay ?? {}),
  };

  if (overlay?.mode) base.mode = overlay.mode;

  return {
    ...base,
    planCornerAdjustments: normalizeCornerAdjustments(overlay?.planCornerAdjustments),
    planCornersAbsolute: Array.isArray(overlay?.planCornersAbsolute) ? overlay!.planCornersAbsolute : [],
    marks: Array.isArray(overlay?.marks) ? overlay!.marks : [],
  };
}

export interface GeoOverlayViewerState {
  mode: "geo-calibrated" | "manual";
  isVisible: boolean;
  opacity: number;
  altitudM: number;
  imageHeading: number;
  latOffset: number;
  lngOffset: number;
  planRotation: number;
  planScale: number;
  planScaleX: number;
  planScaleY: number;
  pitchBias: number;
  cameraRoll: number;
  showLabels: boolean;
  showPerimeter: boolean;
  cleanMode: boolean;
  transformLocked: boolean;
  alignmentGuides: boolean;
  flipX: boolean;
  flipY: boolean;
  planCornerAdjustments: OverlayCornerAdjustment[];
  planCornersAbsolute: { pitch: number; yaw: number }[];
}

export function getGeoOverlayViewerState(
  overlay?: SceneOverlayCalibration | null
): GeoOverlayViewerState {
  const n = normalizeSceneOverlay(overlay);
  return {
    mode: n.mode,
    isVisible: n.isVisible,
    opacity: n.opacity,
    altitudM: n.altitudM,
    imageHeading: n.imageHeading,
    latOffset: n.latOffset,
    lngOffset: n.lngOffset,
    planRotation: n.planRotation,
    planScale: n.planScale,
    planScaleX: n.planScaleX,
    planScaleY: n.planScaleY,
    pitchBias: n.pitchBias,
    cameraRoll: n.cameraRoll,
    showLabels: n.showLabels,
    showPerimeter: n.showPerimeter,
    cleanMode: n.cleanMode,
    transformLocked: n.transformLocked,
    alignmentGuides: n.alignmentGuides,
    flipX: n.flipX,
    flipY: n.flipY,
    planCornerAdjustments: n.planCornerAdjustments,
    planCornersAbsolute: n.planCornersAbsolute,
  };
}
