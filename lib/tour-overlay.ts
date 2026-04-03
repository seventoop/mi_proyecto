export interface OverlayGuideMarkPoint {
  x: number;
  y: number;
}

export interface OverlayGuideMark {
  id: string;
  type: "line" | "rect" | "zone";
  points: OverlayGuideMarkPoint[];
  color?: string;
}

export interface SceneOverlayCalibration {
  mode?: "geo-calibrated";
  isVisible?: boolean;
  opacity?: number;
  altitudM?: number;
  imageHeading?: number;
  latOffset?: number;
  lngOffset?: number;
  planRotation?: number;
  planScale?: number;
  showLabels?: boolean;
  showPerimeter?: boolean;
  cleanMode?: boolean;
  transformLocked?: boolean;
  snapEnabled?: boolean;
  alignmentGuides?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  marks?: OverlayGuideMark[];
}

export interface NormalizedSceneOverlayCalibration {
  mode: "geo-calibrated";
  isVisible: boolean;
  opacity: number;
  altitudM: number;
  imageHeading: number;
  latOffset: number;
  lngOffset: number;
  planRotation: number;
  planScale: number;
  showLabels: boolean;
  showPerimeter: boolean;
  cleanMode: boolean;
  transformLocked: boolean;
  snapEnabled: boolean;
  alignmentGuides: boolean;
  flipX: boolean;
  flipY: boolean;
  marks: OverlayGuideMark[];
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
  showLabels: true,
  showPerimeter: true,
  cleanMode: false,
  transformLocked: false,
  snapEnabled: false,
  alignmentGuides: true,
  flipX: false,
  flipY: false,
  marks: [],
};

export function normalizeSceneOverlay(
  overlay?: SceneOverlayCalibration | null
): NormalizedSceneOverlayCalibration {
  return {
    ...DEFAULT_SCENE_OVERLAY,
    ...(overlay ?? {}),
    mode: "geo-calibrated",
    marks: Array.isArray(overlay?.marks) ? overlay!.marks : [],
  };
}
