"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Loader2, X, Layout } from "lucide-react";
import { toast } from "sonner";

import type { MasterplanUnit } from "@/lib/masterplan-store";
import type { SvgViewBox } from "@/lib/geo-projection";
import Tour360SceneCanvas from "@/components/tour360/tour360-scene-canvas";
import {
    normalizeSceneOverlay,
    type NormalizedSceneOverlayCalibration,
    type SceneOverlayCalibration,
} from "@/lib/tour-overlay";
import PlanGalleryPicker from "@/components/plan-gallery/plan-gallery-picker";

declare global {
    interface Window {
        pannellum: any;
    }
}

interface TourSceneOverlayEditorProps {
    proyectoId: string;
    scene: {
        id: string;
        title: string;
        imageUrl: string;
        masterplanOverlay?: (SceneOverlayCalibration & {
            imageUrl?: string;
            selectedPlanId?: string;
            sceneKey?: string;
            assetVersion?: "original" | "edited";
            originalSceneId?: string;
            hasOverlayEdits?: boolean;
        }) | null;
    };
    units: MasterplanUnit[];
    overlayBounds: [[number, number], [number, number]];
    overlayRotation: number;
    svgViewBox: SvgViewBox;
    planGalleryItems: Array<{
        id: string;
        nombre?: string;
        imageUrl?: string;
    }>;
    projectScenes?: any[];
    onPlanGalleryItemsChange?: (items: any[]) => void;
    onSelectPlan?: (item: any) => void;
    onClose: () => void;
    onSaved: (overlay: SceneOverlayCalibration) => void | Promise<void>;
    onNavigate?: (sceneId: string) => void;
    saveMode?: "internal-tour-scene" | "parent-controlled";
}

export type TourSceneOverlayEditorHandle = {
    saveCurrentSceneSilently: () => Promise<SceneOverlayCalibration | null>;
};

type CanvasTool = "select" | "line" | "arrow" | "text" | "frame" | "image" | "poi" | "overlay" | "location" | "polygon" | "drawing";
type ArrowPresetId =
    | "classic"
    | "thin"
    | "heavy-head"
    | "wayfinding"
    | "bold"
    | "clean"
    | "chevron"
    | "brush"
    | "curve-soft-left"
    | "curve-soft-right"
    | "curve-strong-left"
    | "curve-strong-right";

type ControlPoint = {
    id: string;
    src: { u: number; v: number }; // [0, 1]
    world: { pitch: number; yaw: number };
};

type OverlayInstance = {
    imageUrl: string;
    points: ControlPoint[];
    isFixed: boolean;
    opacity: number;
};

type CanvasOverlayState = {
    lines?: any[];
    anchoredLines?: any[];
    srcNodes?: { x: number; y: number }[]; // Mantener por compatibilidad Phase 1
    dstNodes?: { x: number; y: number }[];
    anchoredDstNodes?: { pitch: number; yaw: number }[];
    activeOverlay?: OverlayInstance; // Nuevo modelo estructurado
    isAnchored?: boolean;
    isFixed?: boolean;
    fixedLineIds?: string[];
    selectedLineIds?: string[];
    texts?: any[];
    anchoredTexts?: any[];
    frames?: any[];         // Nueva persistencia
    anchoredFrames?: any[]; // Nueva persistencia
    images?: any[];         // Nueva persistencia
    anchoredImages?: any[]; // Nueva persistencia
    poiBadges?: any[];
    anchoredPoiBadges?: any[];
    freehandStrokes?: any[];
};

function createEmptyCanvasState(): CanvasOverlayState {
    return {
        lines: [],
        anchoredLines: [],
        srcNodes: [],
        dstNodes: [],
        anchoredDstNodes: [],
        activeOverlay: undefined,
        isAnchored: false,
        isFixed: false,
        fixedLineIds: [],
        selectedLineIds: [],
        texts: [],
        anchoredTexts: [],
        frames: [],
        anchoredFrames: [],
        images: [],
        anchoredImages: [],
        poiBadges: [],
        anchoredPoiBadges: [],
        freehandStrokes: [],
    };
}

function buildInitialCanvasState(
    overlay?: (SceneOverlayCalibration & { canvasState?: CanvasOverlayState }) | null
): CanvasOverlayState {
    return {
        ...createEmptyCanvasState(),
        ...(overlay?.canvasState ?? {}),
    };
}

function hasCanvasItems(items?: any[] | null) {
    return Array.isArray(items) && items.length > 0;
}

function hasRealCanvasContent(canvasState?: CanvasOverlayState | null): boolean {
    if (!canvasState) return false;

    const hasOverlayImage = !!canvasState.activeOverlay?.imageUrl;
    const hasOverlayPoints =
        Array.isArray(canvasState.activeOverlay?.points) &&
        canvasState.activeOverlay.points.length > 0;

    return (
        hasCanvasItems(canvasState.lines) ||
        hasCanvasItems(canvasState.anchoredLines) ||
        hasCanvasItems(canvasState.texts) ||
        hasCanvasItems(canvasState.anchoredTexts) ||
        hasCanvasItems(canvasState.frames) ||
        hasCanvasItems(canvasState.anchoredFrames) ||
        hasCanvasItems(canvasState.images) ||
        hasCanvasItems(canvasState.anchoredImages) ||
        hasCanvasItems(canvasState.poiBadges) ||
        hasCanvasItems(canvasState.anchoredPoiBadges) ||
        hasCanvasItems(canvasState.freehandStrokes) ||
        hasOverlayImage ||
        hasOverlayPoints
    );
}

let pannellumLoaded = false;
let pannellumLoading = false;
const pannellumCallbacks: (() => void)[] = [];

function loadPannellum(callback: () => void) {
    if (pannellumLoaded || (window as any).pannellum) {
        pannellumLoaded = true;
        callback();
        return;
    }

    pannellumCallbacks.push(callback);
    if (pannellumLoading) return;

    pannellumLoading = true;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    script.onload = () => {
        pannellumLoaded = true;
        pannellumLoading = false;
        pannellumCallbacks.forEach((cb) => cb());
        pannellumCallbacks.length = 0;
    };
    document.head.appendChild(script);
}

const MOVE_STEP = 5;
const MOVE_STEP_FAST = 25;
const MOVE_STEP_FINE = 1;
const SNAP_OFFSET = 1;
const MAX_HISTORY = 80;

const TourSceneOverlayEditor = forwardRef<TourSceneOverlayEditorHandle, TourSceneOverlayEditorProps>(function TourSceneOverlayEditor({
    proyectoId,
    scene,
    units,
    overlayBounds,
    overlayRotation,
    svgViewBox,
    planGalleryItems,
    projectScenes = [],
    onSelectPlan,
    onClose,
    onSaved,
    onNavigate,
    saveMode = "internal-tour-scene",
}, ref) {
    const arrowPresets: Array<{
        id: ArrowPresetId;
        title: string;
        description: string;
        strokeWidth: number;
        headSize: number;
        strokeLinecap?: "round" | "square";
        outlined?: boolean;
        bend?: number;
        curveDirection?: "left" | "right";
        markerPoints?: string;
    }> = [
            { id: "classic", title: "Recta simple", description: "Equilibrada para recorridos", strokeWidth: 3, headSize: 6, strokeLinecap: "square" },
            { id: "thin", title: "Recta fina", description: "Ligera y técnica", strokeWidth: 2, headSize: 5, strokeLinecap: "round" },
            { id: "heavy-head", title: "Punta destacada", description: "Jerarquía clara en la dirección", strokeWidth: 4, headSize: 10, strokeLinecap: "square" },
            { id: "wayfinding", title: "Señalizadora", description: "Más visible para accesos y calles", strokeWidth: 5, headSize: 9, strokeLinecap: "round", outlined: true, markerPoints: "0 0, 9 4.5, 0 9, 4 4.5" },
            { id: "bold", title: "Recta gruesa", description: "Marcación fuerte del recorrido", strokeWidth: 6, headSize: 8, strokeLinecap: "square" },
            { id: "clean", title: "Limpia comercial", description: "Visual prolija y neutra", strokeWidth: 4, headSize: 7, strokeLinecap: "round" },
            { id: "chevron", title: "Vial / chevrón", description: "Ideal para señalizar accesos", strokeWidth: 4, headSize: 10, strokeLinecap: "round", markerPoints: "0 0, 10 5, 0 10, 3.5 5" },
            { id: "brush", title: "Trazo brush", description: "Más gestual y direccional", strokeWidth: 5, headSize: 9, strokeLinecap: "round" },
            { id: "curve-soft-left", title: "Curva suave izquierda", description: "Desvío sutil hacia la izquierda", strokeWidth: 4, headSize: 7, strokeLinecap: "round", bend: 42, curveDirection: "left" },
            { id: "curve-soft-right", title: "Curva suave derecha", description: "Desvío sutil hacia la derecha", strokeWidth: 4, headSize: 7, strokeLinecap: "round", bend: 42, curveDirection: "right" },
            { id: "curve-strong-left", title: "Curva marcada izquierda", description: "Guía visual más intensa", strokeWidth: 5, headSize: 9, strokeLinecap: "round", bend: 78, curveDirection: "left" },
            { id: "curve-strong-right", title: "Curva marcada derecha", description: "Dirección fuerte hacia la derecha", strokeWidth: 5, headSize: 9, strokeLinecap: "round", bend: 78, curveDirection: "right" },
        ];

    const viewerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);
    const [viewerInstance, setViewerInstance] = useState<any>(null);

    const initial = useMemo(
        () => normalizeSceneOverlay(scene.masterplanOverlay),
        [scene.masterplanOverlay]
    );

    const [draft, setDraft] = useState<NormalizedSceneOverlayCalibration>(() => ({
        ...initial,
        isVisible: false,
    }));

    // 1. Declaración de Estados base
    const [isLoading, setIsLoading] = useState(true);
    const [viewerReady, setViewerReady] = useState(false);
    const [isSavingCalib, setIsSavingCalib] = useState(false);
    const [anchorTrigger, setAnchorTrigger] = useState(0);
    const [fixTrigger, setFixTrigger] = useState(0);
    const [showPlanosGallery, setShowPlanosGallery] = useState(false);
    const [calibSaved, setCalibSaved] = useState(false);
    const [addTextTrigger, setAddTextTrigger] = useState<{ type: string; text: string; timestamp: number } | null>(null);
    const [addFrameTrigger, setAddFrameTrigger] = useState<{ type: "circle" | "square"; timestamp: number } | null>(null);
    const [addPoiBadgeTrigger, setAddPoiBadgeTrigger] = useState<{
        variant: "circle" | "square";
        imageUrl?: string;
        title?: string;
        timestamp: number;
    } | null>(null);
    const [activeArrowPreset, setActiveArrowPreset] = useState<ArrowPresetId>("classic");
    const [activePoiVariant, setActivePoiVariant] = useState<"circle" | "square">("circle");
    const [isEditing, setIsEditing] = useState(true);
    const [activeTool, setActiveTool] = useState<CanvasTool>("select");
    const [undoStack, setUndoStack] = useState<NormalizedSceneOverlayCalibration[]>([]);
    const [redoStack, setRedoStack] = useState<NormalizedSceneOverlayCalibration[]>([]);
    const isTemporaryScene = typeof scene.id === "string" && scene.id.startsWith("scene-");
    const shouldPersistInternally = saveMode !== "parent-controlled" && !isTemporaryScene;
    const [editorTab, setEditorTab] = useState<"GUÍAS" | "OVERLAY" | "VISTA">("GUÍAS");
    const [selectAllTrigger, setSelectAllTrigger] = useState(0);
    const [deselectAllTrigger, setDeselectAllTrigger] = useState(0);

    // 2. Estado del Canvas y Overlay (Fuente de verdad)
    const [canvasState, setCanvasState] = useState<CanvasOverlayState>(() =>
        buildInitialCanvasState(scene.masterplanOverlay ?? undefined)
    );

    // 3. Estados derivados o sincronizados
    const [planImageUrl, setPlanImageUrl] = useState<string | null>(() => {
        return (
            canvasState?.activeOverlay?.imageUrl ||
            (scene.masterplanOverlay as any)?.canvasState?.activeOverlay?.imageUrl ||
            scene.masterplanOverlay?.imageUrl ||
            null
        );
    });

    // 4. Efectos de sincronización
    useEffect(() => {
        if (canvasState.activeOverlay?.imageUrl && canvasState.activeOverlay.imageUrl !== planImageUrl) {
            setPlanImageUrl(canvasState.activeOverlay.imageUrl);
        }
    }, [canvasState.activeOverlay?.imageUrl, planImageUrl]);

    const canvasStateRef = useRef<CanvasOverlayState>(canvasState);
    const draftRef = useRef(draft);

    const getProjectSceneKey = useCallback((item: any) => {
        return item?.masterplanOverlay?.sceneKey ?? item?.sceneKey ?? undefined;
    }, []);

    const resolveTargetSceneId = useCallback((target: { sceneId?: string; sceneKey?: string }) => {
        if (target.sceneKey) {
            const sceneByKey = projectScenes.find((item) => getProjectSceneKey(item) === target.sceneKey);
            if (sceneByKey?.id) return sceneByKey.id;
        }

        if (target.sceneId) {
            const sceneById = projectScenes.find((item) => item.id === target.sceneId);
            if (sceneById?.id) return sceneById.id;
        }

        return undefined;
    }, [getProjectSceneKey, projectScenes]);

    useEffect(() => {
        canvasStateRef.current = canvasState;
    }, [canvasState]);

    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    useEffect(() => {
        const body = document.body;
        const html = document.documentElement;

        const previousBodyOverflow = body.style.overflow;
        const previousBodyOverscroll = body.style.overscrollBehavior;
        const previousHtmlOverflow = html.style.overflow;
        const previousHtmlOverscroll = html.style.overscrollBehavior;

        body.style.overflow = "hidden";
        body.style.overscrollBehavior = "none";
        html.style.overflow = "hidden";
        html.style.overscrollBehavior = "none";

        return () => {
            body.style.overflow = previousBodyOverflow;
            body.style.overscrollBehavior = previousBodyOverscroll;
            html.style.overflow = previousHtmlOverflow;
            html.style.overscrollBehavior = previousHtmlOverscroll;
        };
    }, []);

    useEffect(() => {
        setDraft({ ...initial, isVisible: false });
        setUndoStack([]);
        setRedoStack([]);
        setCalibSaved(false);
        setCanvasState(buildInitialCanvasState(scene.masterplanOverlay ?? undefined));
    }, [initial, scene.masterplanOverlay]);

    const commitDraft = useCallback(
        (
            updater:
                | Partial<SceneOverlayCalibration>
                | ((prev: NormalizedSceneOverlayCalibration) => Partial<NormalizedSceneOverlayCalibration>),
            options?: { recordHistory?: boolean }
        ) => {
            setDraft((prev) => {
                const next = normalizeSceneOverlay(
                    typeof updater === "function" ? (updater(prev) as Partial<SceneOverlayCalibration>) : { ...prev, ...updater }
                ) as NormalizedSceneOverlayCalibration;

                if (JSON.stringify(prev) === JSON.stringify(next)) return prev;

                if (options?.recordHistory !== false) {
                    setUndoStack((stack) => [...stack.slice(-(MAX_HISTORY - 1)), prev]);
                    setRedoStack([]);
                }

                setCalibSaved(false);
                return next;
            });
        },
        []
    );

    const undo = useCallback(() => {
        setUndoStack((stack) => {
            const previous = stack[stack.length - 1];
            if (!previous) return stack;

            setRedoStack((future) => [...future.slice(-(MAX_HISTORY - 1)), draftRef.current]);
            setDraft(previous);
            setCalibSaved(false);

            return stack.slice(0, -1);
        });
    }, []);

    const redo = useCallback(() => {
        setRedoStack((stack) => {
            const next = stack[stack.length - 1];
            if (!next) return stack;

            setUndoStack((history) => [...history.slice(-(MAX_HISTORY - 1)), draftRef.current]);
            setDraft(next);
            setCalibSaved(false);

            return stack.slice(0, -1);
        });
    }, []);

    const roundIfSnap = useCallback((value: number, step: number) => {
        if (!draftRef.current.snapEnabled) return value;
        return Math.round(value / step) * step;
    }, []);

    const baseLat = (overlayBounds[0][0] + overlayBounds[1][0]) / 2;
    const baseLng = (overlayBounds[0][1] + overlayBounds[1][1]) / 2;
    const baseCosLat = Math.cos((baseLat * Math.PI) / 180) || 1;

    const camLat = baseLat + draft.latOffset / 111320;
    const camLng = baseLng + draft.lngOffset / (111320 * baseCosLat);

    const resolvedSelectedPlanId =
        planGalleryItems.find((item) => item.id === scene.masterplanOverlay?.selectedPlanId)?.id ??
        scene.masterplanOverlay?.selectedPlanId ??
        null;

    const resolvedPlanImageUrl =
        planGalleryItems.find((item) => item.id === resolvedSelectedPlanId)?.imageUrl ??
        scene.masterplanOverlay?.imageUrl ??
        ((draft as SceneOverlayCalibration & { imageUrl?: string }).imageUrl ?? null);

    useEffect(() => {
        loadPannellum(() => {
            if (!viewerRef.current || !(window as any).pannellum) return;

            setIsLoading(false);

            try {
                instanceRef.current = (window as any).pannellum.viewer(viewerRef.current, {
                    type: "equirectangular",
                    panorama: scene.imageUrl,
                    autoLoad: true,
                    showControls: false,
                    mouseZoom: false,
                    hfov: 100,
                    minHfov: 40,
                    maxHfov: 120,
                    compass: false,
                    hotSpots: [],
                });

                instanceRef.current.on("load", () => {
                    setViewerReady(true);
                    setViewerInstance(instanceRef.current);
                });
            } catch (err) {
                console.error("[TourSceneOverlayEditor] Pannellum error", err);
            }
        });

        return () => {
            setViewerReady(false);
            setViewerInstance(null);
            try {
                instanceRef.current?.destroy();
            } catch { }
            instanceRef.current = null;
        };
    }, [scene.imageUrl]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            const viewer = instanceRef.current;
            const container = containerRef.current;
            if (!viewer || !container) return;

            const rect = container.getBoundingClientRect();
            if (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (isEditing && !draftRef.current.transformLocked && (e.altKey || e.shiftKey || e.ctrlKey)) {
                const factor = e.deltaY > 0 ? 1.08 : 0.925;
                commitDraft((prev): Partial<NormalizedSceneOverlayCalibration> => ({
                    ...prev,
                    altitudM: Math.max(1, Math.round(prev.altitudM * factor)),
                }));
                return;
            }

            try {
                const currentFov = viewer.getHfov() as number;
                const delta = e.deltaY > 0 ? 5 : -5;
                viewer.setHfov(currentFov + delta);
            } catch (err) {
                console.error("[TourSceneOverlayEditor] Zoom error", err);
            }
        };

        window.addEventListener("wheel", handleWheel, {
            capture: true,
            passive: false,
        });

        return () => {
            window.removeEventListener("wheel", handleWheel, {
                capture: true,
            } as any);
        };
    }, [commitDraft, isEditing]);

    const arrowStep = useCallback(
        (screenDx: number, screenDy: number, stepM: number) => {
            const viewer = instanceRef.current;
            if (!viewer || draftRef.current.transformLocked) return;

            const DEG = Math.PI / 180;
            const viewYaw = (() => {
                try {
                    return viewer.getYaw() as number;
                } catch {
                    return 0;
                }
            })();

            const effHdgRad = (draftRef.current.imageHeading + viewYaw) * DEG;
            const north_m =
                (screenDx * -Math.sin(effHdgRad) + screenDy * -Math.cos(effHdgRad)) * stepM;
            const east_m =
                (screenDx * Math.cos(effHdgRad) + screenDy * -Math.sin(effHdgRad)) * stepM;

            commitDraft((prev): Partial<NormalizedSceneOverlayCalibration> => ({
                ...prev,
                latOffset: roundIfSnap(prev.latOffset - north_m, SNAP_OFFSET),
                lngOffset: roundIfSnap(prev.lngOffset - east_m, SNAP_OFFSET),
            }));
        },
        [commitDraft, roundIfSnap]
    );

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (!isEditing || draftRef.current.transformLocked) return;

            const target = e.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            if (tag === "input" || tag === "textarea") return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                redo();
                return;
            }

            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

            e.preventDefault();
            const step = e.altKey || e.ctrlKey ? MOVE_STEP_FINE : e.shiftKey ? MOVE_STEP_FAST : MOVE_STEP;

            if (e.key === "ArrowUp") arrowStep(0, -1, step);
            if (e.key === "ArrowDown") arrowStep(0, 1, step);
            if (e.key === "ArrowLeft") arrowStep(-1, 0, step);
            if (e.key === "ArrowRight") arrowStep(1, 0, step);
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [arrowStep, isEditing, redo, undo]);



    /**
     * Fase 3: Auto-ajuste de la instancia del overlay sobre las guías amarillas
     */
    const getAutoFitPoints = useCallback((): ControlPoint[] => {
        // Extraer líneas ancladas
        const guides = canvasState.anchoredLines || [];

        // 1. Caso SIN líneas: Centrar frente a cámara con un tamaño default
        if (guides.length === 0) {
            const pitch = viewerInstance?.getPitch?.() ?? 0;
            const yaw = viewerInstance?.getYaw?.() ?? 0;
            const spread = 20; // Ancho default en grados

            return [
                { id: "p0", src: { u: 0, v: 1 }, world: { pitch: pitch - spread / 2, yaw: yaw - spread } },
                { id: "p1", src: { u: 0, v: 0 }, world: { pitch: pitch + spread / 2, yaw: yaw - spread } },
                { id: "p2", src: { u: 1, v: 0 }, world: { pitch: pitch + spread / 2, yaw: yaw + spread } },
                { id: "p3", src: { u: 1, v: 1 }, world: { pitch: pitch - spread / 2, yaw: yaw + spread } },
            ];
        }

        // 2. Caso CON líneas: Calcular envolvente (Bounding Box) en World-Space
        const vertices: { pitch: number; yaw: number }[] = [];
        guides.forEach(l => {
            if (l.pitch1 !== undefined && l.yaw1 !== undefined) vertices.push({ pitch: l.pitch1, yaw: l.yaw1 });
            if (l.pitch2 !== undefined && l.yaw2 !== undefined) vertices.push({ pitch: l.pitch2, yaw: l.yaw2 });
        });

        // Estrategia de normalización de Yaw para evitar ruptura en el meridiano 180/-180
        const meanYaw = vertices.reduce((acc, v) => acc + v.yaw, 0) / vertices.length;

        const normalizeYaw = (y: number) => {
            let relative = y - meanYaw;
            while (relative > 180) relative -= 360;
            while (relative < -180) relative += 360;
            return relative + meanYaw;
        };

        const normalizedVertices = vertices.map(v => ({
            pitch: v.pitch,
            yaw: normalizeYaw(v.yaw)
        }));

        let minP = Math.min(...normalizedVertices.map(v => v.pitch));
        let maxP = Math.max(...normalizedVertices.map(v => v.pitch));
        let minY = Math.min(...normalizedVertices.map(v => v.yaw));
        let maxY = Math.max(...normalizedVertices.map(v => v.yaw));

        // Re-mapear al rango estándar [-180, 180]
        const finalizeYaw = (y: number) => {
            let final = y;
            while (final > 180) final -= 360;
            while (final < -180) final += 360;
            return final;
        };

        // Orden Perimetral Consistente: BL -> TL -> TR -> BR
        return [
            { id: "p0", src: { u: 0, v: 1 }, world: { pitch: minP, yaw: finalizeYaw(minY) } },
            { id: "p1", src: { u: 0, v: 0 }, world: { pitch: maxP, yaw: finalizeYaw(minY) } },
            { id: "p2", src: { u: 1, v: 0 }, world: { pitch: maxP, yaw: finalizeYaw(maxY) } },
            { id: "p3", src: { u: 1, v: 1 }, world: { pitch: minP, yaw: finalizeYaw(maxY) } },
        ];
    }, [canvasState.anchoredLines, viewerInstance]);

    const handleSelectPlan = (imageUrl: string) => {
        setCanvasState((prev) => {
            // Si ya existe instancia, solo cambiamos la imagen para no perder el ajuste previo
            if (prev.activeOverlay) {
                return {
                    ...prev,
                    activeOverlay: { ...prev.activeOverlay, imageUrl }
                };
            }
            // Si es nuevo, realizamos el auto-ajuste inicial
            return {
                ...prev,
                activeOverlay: {
                    imageUrl,
                    points: getAutoFitPoints(),
                    isFixed: false,
                    opacity: 0.8
                }
            };
        });

        setPlanImageUrl(imageUrl);
        setShowPlanosGallery(false);
        // Salto automático al modo de ajuste para feedback inmediato
        setEditorTab("OVERLAY");
    };

    const handleMeshResolutionChange = useCallback((resolution: 4 | 6 | 8) => {
        setCanvasState((prev) => {
            if (!prev.activeOverlay) return prev;

            const currentPoints = prev.activeOverlay.points;
            if (currentPoints.length === resolution) return prev;

            let nextPoints: ControlPoint[] = [];

            // Lógica de INTERPOLACIÓN para asegurar que la imagen no salte bruscamente
            if (resolution === 6 && currentPoints.length === 4) {
                // 4 -> 6: Agregar puntos medios arriba (entre 1-2) y abajo (entre 3-0)
                const p0 = currentPoints[0]; // BL
                const p1 = currentPoints[1]; // TL
                const p2 = currentPoints[2]; // TR
                const p3 = currentPoints[3]; // BR

                const tm = {
                    pitch: (p1.world.pitch + p2.world.pitch) / 2,
                    yaw: (p1.world.yaw + p2.world.yaw) / 2
                };
                const bm = {
                    pitch: (p3.world.pitch + p0.world.pitch) / 2,
                    yaw: (p3.world.yaw + p0.world.yaw) / 2
                };

                nextPoints = [
                    p0,
                    p1,
                    { id: "opt-6-tm", src: { u: 0.5, v: 0 }, world: tm },
                    p2,
                    p3,
                    { id: "opt-6-bm", src: { u: 0.5, v: 1 }, world: bm }
                ];
            } else if (resolution === 8 && currentPoints.length === 6) {
                // 6 -> 8: Agregar puntos medios a los lados (izquierda entre 0-1, derecha entre 3-4)
                const ml = {
                    pitch: (currentPoints[0].world.pitch + currentPoints[1].world.pitch) / 2,
                    yaw: (currentPoints[0].world.yaw + currentPoints[1].world.yaw) / 2
                };
                const mr = {
                    pitch: (currentPoints[3].world.pitch + currentPoints[4].world.pitch) / 2,
                    yaw: (currentPoints[3].world.yaw + currentPoints[4].world.yaw) / 2
                };

                nextPoints = [
                    currentPoints[0],
                    { id: "opt-8-ml", src: { u: 0, v: 0.5 }, world: ml },
                    currentPoints[1],
                    currentPoints[2],
                    currentPoints[3],
                    { id: "opt-8-mr", src: { u: 1, v: 0.5 }, world: mr },
                    currentPoints[4],
                    currentPoints[5]
                ];
            } else if (resolution === 4) {
                // Vuelta al caso base de 4 esquinas (preservando los índices originales)
                if (currentPoints.length === 6) {
                    nextPoints = [currentPoints[0], currentPoints[1], currentPoints[3], currentPoints[4]];
                } else if (currentPoints.length === 8) {
                    nextPoints = [currentPoints[0], currentPoints[2], currentPoints[4], currentPoints[6]];
                } else {
                    nextPoints = currentPoints.slice(0, 4);
                }
            } else if (resolution === 6 && currentPoints.length === 8) {
                // 8 -> 6: Eliminar puntos laterales
                nextPoints = [currentPoints[0], currentPoints[2], currentPoints[3], currentPoints[4], currentPoints[6], currentPoints[7]];
            } else {
                // Fallback de seguridad por si llega una combinación no prevista
                return prev;
            }

            return {
                ...prev,
                activeOverlay: {
                    ...prev.activeOverlay,
                    points: nextPoints
                }
            };
        });
    }, []);

    // Guardado COMPLETO: persiste en DB y notifica al padre (cierra el editor via onSaved)
    const saveCalibration = useCallback(async () => {
        setIsSavingCalib(true);
        const nextCanvasState = canvasStateRef.current;
        const nextHasOverlayEdits = hasRealCanvasContent(nextCanvasState);

        const nextOverlay: SceneOverlayCalibration & {
            imageUrl?: string;
            selectedPlanId?: string | null;
            canvasState?: CanvasOverlayState;
            frames?: any[];
            images?: any[];
            assetVersion?: "original" | "edited";
            originalSceneId?: string;
            hasOverlayEdits?: boolean;
        } = {
            ...(scene.masterplanOverlay ?? {}),
            ...draftRef.current,
            imageUrl: planImageUrl ?? resolvedPlanImageUrl ?? undefined,
            selectedPlanId: resolvedSelectedPlanId ?? undefined,
            canvasState: nextCanvasState,
            frames: nextCanvasState.frames,
            images: nextCanvasState.images,
            assetVersion: scene.masterplanOverlay?.assetVersion === "edited" ? "edited" : "original",
            originalSceneId:
                scene.masterplanOverlay?.assetVersion === "edited"
                    ? (scene.masterplanOverlay?.originalSceneId ?? scene.id)
                    : undefined,
            hasOverlayEdits: nextHasOverlayEdits,
        };

        let persistedOverlay: SceneOverlayCalibration = nextOverlay;

        try {
            if (shouldPersistInternally) {
                const res = await fetch(`/api/tours/scenes/${scene.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ masterplanOverlay: nextOverlay }),
                });

                if (!res.ok) throw new Error("Error al guardar");

                const savedScene = await res.json();
                persistedOverlay = savedScene?.masterplanOverlay ?? nextOverlay;
            }

            setCalibSaved(true);
            if (saveMode !== "parent-controlled" && isTemporaryScene) {
                toast.info("Cambios listos. Guardá los cambios del tour para persistir esta escena nueva.");
            }
            await onSaved(persistedOverlay);
            if (shouldPersistInternally) {
                toast.success("Alineación guardada");
            }
        } catch (err) {
            console.error("[TourSceneOverlayEditor] Save calibration error", err);
            toast.error("No se pudo guardar la alineación");
        } finally {
            setIsSavingCalib(false);
        }
    }, [isTemporaryScene, onSaved, planImageUrl, resolvedPlanImageUrl, resolvedSelectedPlanId, saveMode, scene.id, shouldPersistInternally]);

    // Guardado SILENCIOSO: persiste en DB pero NO cierra el editor ni muestra toast
    // Usado para auto-guardar al saltar entre portales y para el commit final del tour completo
    const saveCalibrationSilent = useCallback(async (): Promise<SceneOverlayCalibration | null> => {
        const nextCanvasState = canvasStateRef.current;
        const nextHasOverlayEdits = hasRealCanvasContent(nextCanvasState);

        const nextOverlay: SceneOverlayCalibration & {
            imageUrl?: string;
            selectedPlanId?: string | null;
            canvasState?: CanvasOverlayState;
            frames?: any[];
            images?: any[];
            assetVersion?: "original" | "edited";
            originalSceneId?: string;
            hasOverlayEdits?: boolean;
        } = {
            ...(scene.masterplanOverlay ?? {}),
            ...draftRef.current,
            imageUrl: planImageUrl ?? resolvedPlanImageUrl ?? undefined,
            selectedPlanId: resolvedSelectedPlanId ?? undefined,
            canvasState: nextCanvasState,
            frames: nextCanvasState.frames,
            images: nextCanvasState.images,
            assetVersion: scene.masterplanOverlay?.assetVersion === "edited" ? "edited" : "original",
            originalSceneId:
                scene.masterplanOverlay?.assetVersion === "edited"
                    ? (scene.masterplanOverlay?.originalSceneId ?? scene.id)
                    : undefined,
            hasOverlayEdits: nextHasOverlayEdits,
        };

        let persistedOverlay: SceneOverlayCalibration = nextOverlay;
        try {
            if (shouldPersistInternally) {
                const res = await fetch(`/api/tours/scenes/${scene.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ masterplanOverlay: nextOverlay }),
                });

                if (!res.ok) throw new Error("Error al guardar silenciosamente");

                const savedScene = await res.json();
                persistedOverlay = savedScene?.masterplanOverlay ?? nextOverlay;
            }
            await onSaved(persistedOverlay);
            setCalibSaved(true);
            return persistedOverlay;
        } catch (err) {
            console.error("[TourSceneOverlayEditor] Silent save error", err);
            return null;
        }
    }, [onSaved, planImageUrl, resolvedPlanImageUrl, resolvedSelectedPlanId, scene.id, shouldPersistInternally]);

    useImperativeHandle(ref, () => ({
        saveCurrentSceneSilently: saveCalibrationSilent,
    }), [saveCalibrationSilent]);

    const prevCanvasStateSummaryRef = useRef<string>("");

    const handleCanvasStateChange = useCallback((nextState: CanvasOverlayState) => {
        setCanvasState(nextState);
        canvasStateRef.current = nextState;
        setCalibSaved(false);

        // Detectar cambios significativos para el historial (Undo/Redo)
        const summary = JSON.stringify({
            lineCount: nextState.lines?.length,
            anchoredCount: nextState.anchoredLines?.length,
            isAnchored: nextState.isAnchored,
            overlayId: nextState.activeOverlay?.imageUrl,
            pointsHash: nextState.activeOverlay?.points.length,
            freehandCount: nextState.freehandStrokes?.length,
        });

        if (summary !== prevCanvasStateSummaryRef.current) {
            prevCanvasStateSummaryRef.current = summary;

            // Forzamos un commit al historial de la calibración incluyendo el estado del canvas
            commitDraft((prev): Partial<NormalizedSceneOverlayCalibration> => ({
                ...prev,
                canvasState: nextState
            }), { recordHistory: true });
        }

        // Sincronizar esquinas del overlay si es de 4 puntos (retrocompatibilidad)
        if (nextState.anchoredDstNodes && nextState.anchoredDstNodes.length === 4) {
            setDraft(prev => ({
                ...prev,
                planCornersAbsolute: nextState.anchoredDstNodes
            }) as NormalizedSceneOverlayCalibration);
        }
    }, [commitDraft]);

    const currentPlanImageUrl = planImageUrl ?? resolvedPlanImageUrl ?? null;

    return (
        <div className="fixed inset-0 z-[9999] flex h-[100dvh] flex-col overflow-hidden bg-black/90">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg">360</span>
                    <span className="text-sm font-medium text-white">
                        {scene.title || "Imagen sin título"}
                    </span>
                    <div className="flex gap-1 ml-4 py-1 px-1 bg-white/5 rounded-full">
                        {(["GUÍAS", "OVERLAY", "VISTA"] as const).map((tab, idx) => (
                            <button
                                key={tab}
                                onClick={() => setEditorTab(tab)}
                                className={`px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${editorTab === tab
                                    ? "bg-white text-black shadow-lg"
                                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                                    }`}
                            >
                                {idx + 1}. {tab === "GUÍAS" ? "TRAZAR GUÍAS" : tab === "OVERLAY" ? "PROYECTAR PLANO" : "VISTA FINAL"}
                            </button>
                        ))}
                    </div>

                    {/* Barra Contextual de Guías (Solo en modo GUÍAS) */}
                    {editorTab === "GUÍAS" && (
                        <div className="flex items-center gap-2 ml-6 pl-6 border-l border-white/10">
                            <button
                                onClick={() => setSelectAllTrigger((prev) => prev + 1)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 text-[10px] font-bold hover:bg-yellow-500/20 transition-all"
                                title="Seleccionar todas las líneas (también: Ctrl+A)"
                            >
                                <span className="text-xs">▣</span> SELECCIONAR TODAS
                            </button>
                            <button
                                onClick={() => setDeselectAllTrigger((prev) => prev + 1)}
                                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[10px] font-bold hover:bg-white/10 hover:text-white/70 transition-all"
                                title="Deseleccionar todas"
                            >
                                DESELECCIONAR
                            </button>
                        </div>
                    )}

                    {/* Barra Contextual del Overlay (Solo en modo OVERLAY) */}
                    {editorTab === "OVERLAY" && canvasState.activeOverlay && (
                        <div className="flex items-center gap-4 ml-6 pl-6 border-l border-white/10">
                            <button
                                onClick={() => {
                                    const points = getAutoFitPoints();
                                    setCanvasState(prev => ({
                                        ...prev,
                                        activeOverlay: prev.activeOverlay ? { ...prev.activeOverlay, points } : undefined
                                    }));
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-[10px] font-bold hover:bg-green-500/20 transition-all"
                            >
                                <span className="text-xs">🧲</span> AJUSTAR A GUÍAS
                            </button>

                            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                                {[4, 6, 8].map((res) => (
                                    <button
                                        key={res}
                                        onClick={() => handleMeshResolutionChange(res as any)}
                                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${canvasState.activeOverlay?.points.length === res
                                            ? "bg-white/20 text-white"
                                            : "text-white/30 hover:text-white/60"
                                            }`}
                                    >
                                        {res}P
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                                <span className="text-[9px] font-bold text-white/40 uppercase">Opacidad</span>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.1"
                                    value={canvasState.activeOverlay.opacity ?? 0.8}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setCanvasState(prev => ({
                                            ...prev,
                                            activeOverlay: prev.activeOverlay ? { ...prev.activeOverlay, opacity: val } : undefined
                                        }));
                                    }}
                                    className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                            </div>

                            <button
                                onClick={() => setCanvasState(prev => ({ ...prev, activeOverlay: undefined }))}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                                title="Eliminar Overlay"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsEditing((prev) => !prev)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                    >
                        {isEditing ? "Modo edición" : "Modo navegación"}
                    </button>

                    <button
                        onClick={saveCalibration}
                        disabled={isSavingCalib}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                    >
                        {isSavingCalib ? "Guardando..." : calibSaved ? (isTemporaryScene ? "Listo para guardar cambios" : "Guardado") : "Guardar"}
                    </button>

                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 min-h-0 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                    </div>
                )}

                <aside className="absolute inset-y-0 left-0 z-30 w-24 border-r border-white/10 bg-slate-950/90 backdrop-blur-xl">
                    <div className="flex h-full flex-col items-center gap-3 px-2 py-4">
                        <ToolButton
                            label="Selección"
                            active={activeTool === "select"}
                            onClick={() => setActiveTool("select")}
                        />
                        <ToolButton
                            label="Línea"
                            active={activeTool === "line"}
                            onClick={() => setActiveTool("line")}
                        />
                        <ToolButton
                            label="Flecha"
                            active={activeTool === "arrow"}
                            onClick={() => setActiveTool("arrow")}
                        />
                        <ToolButton
                            label="Texto"
                            active={activeTool === "text"}
                            onClick={() => {
                                console.log("Clic en herramienta Texto");
                                setActiveTool(activeTool === "text" ? "select" : "text");
                            }}
                            disabled={false}
                        />
                        <ToolButton
                            label="Marco"
                            active={activeTool === "frame"}
                            onClick={() => {
                                setActiveTool(activeTool === "frame" ? "select" : "frame");
                            }}
                        />
                        <ToolButton
                            label="Imagen"
                            active={activeTool === "image"}
                            onClick={() => setActiveTool("image")}
                        />
                        <ToolButton
                            label="POI"
                            active={activeTool === "poi"}
                            onClick={() => setActiveTool(activeTool === "poi" ? "select" : "poi")}
                        />
                        <ToolButton
                            label="Ubicación"
                            active={activeTool === "location"}
                            onClick={() => setActiveTool(activeTool === "location" ? "select" : "location")}
                        />
                        <ToolButton
                            label="Polígonos / Grilla"
                            active={activeTool === "polygon"}
                            onClick={() => setActiveTool(activeTool === "polygon" ? "select" : "polygon")}
                        />
                        <ToolButton
                            label="Lápiz / Dibujo"
                            active={activeTool === "drawing"}
                            onClick={() => setActiveTool(activeTool === "drawing" ? "select" : "drawing")}
                        />
                        {(() => {
                            const selectedIds = canvasState.selectedLineIds ?? [];
                            const hasSelection = selectedIds.length > 0;

                            const isAllSelectedAnchored = hasSelection && selectedIds.every(
                                (id) => canvasState.anchoredLines?.some((al) => al.id === id)
                            );

                            const isAllSelectedFixed = hasSelection && selectedIds.every(
                                (id) => canvasState.fixedLineIds?.includes(id)
                            );

                            const isAnyFixed = hasSelection && selectedIds.some(
                                (id) => canvasState.fixedLineIds?.includes(id)
                            );

                            return (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <ToolButton
                                            label="Fijar"
                                            active={false} // Siempre disponible para lo seleccionado
                                            disabled={!hasSelection}
                                            title="Fijar posición en el mundo 3D y bloquear"
                                            onClick={() => {
                                                setAnchorTrigger((prev) => prev + 1);
                                                setFixTrigger((prev) => prev + 1);
                                            }}
                                        />
                                        <ToolButton
                                            label="Liberar"
                                            active={false}
                                            disabled={!hasSelection || !isAnyFixed}
                                            title="Liberar para editar"
                                            onClick={() => {
                                                setFixTrigger((prev) => prev + 1);
                                            }}
                                        />
                                    </div>
                                </>
                            );
                        })()}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setShowPlanosGallery(true)}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                <Layout size={18} />
                                {planImageUrl ? "Cambiar Plano" : "Vincular Plano"}
                            </button>

                            {planImageUrl && (
                                <button
                                    onClick={() => {
                                        setPlanImageUrl(null);
                                        setCalibSaved(false);
                                        // Limpiar referencia en el draft para persistencia real
                                        setDraft(prev => ({
                                            ...prev,
                                            imageUrl: undefined,
                                            selectedPlanId: undefined
                                        }) as NormalizedSceneOverlayCalibration);
                                        toast.success("Plano desvinculado de esta escena.");
                                    }}
                                    className="w-full py-2 text-[10px] text-red-400 hover:text-red-300 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                                >
                                    <X size={12} />
                                    Eliminar definitivamente
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Panel lateral de Estilos de Texto (Estilo Canva) */}
                {activeTool === "text" && (
                    <aside className="absolute left-24 top-0 bottom-0 z-[100] w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Estilos de texto</h3>
                            <button onClick={() => setActiveTool("select")} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <button
                            className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                            onClick={() => setAddTextTrigger({ type: "title", text: "Agregar un título", timestamp: Date.now() })}
                        >
                            <span className="block text-xl font-bold text-white mb-1 group-hover:scale-[1.02] transition-transform">Agregar un título</span>
                            <span className="text-[10px] text-white/40">Fuente grande y negrita</span>
                        </button>

                        <button
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                            onClick={() => setAddTextTrigger({ type: "subtitle", text: "Agregar un subtítulo", timestamp: Date.now() })}
                        >
                            <span className="block text-base font-semibold text-white mb-1 group-hover:scale-[1.02] transition-transform">Agregar un subtítulo</span>
                            <span className="text-[10px] text-white/40">Fuente media</span>
                        </button>

                        <button
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                            onClick={() => setAddTextTrigger({ type: "body", text: "Agregar algo de texto", timestamp: Date.now() })}
                        >
                            <span className="block text-xs text-white mb-1 group-hover:scale-[1.02] transition-transform">Agregar algo de texto</span>
                            <span className="text-[10px] text-white/40">Fuente de cuerpo de texto</span>
                        </button>
                    </aside>
                )}

                {activeTool === "arrow" && (
                    <aside className="absolute left-24 top-0 bottom-0 z-[100] w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Presets de flecha</h3>
                            <button onClick={() => setActiveTool("select")} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                            {arrowPresets.map((preset) => {
                                const isActivePreset = activeArrowPreset === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        className={`w-full text-left p-3 rounded-xl border transition-all group ${isActivePreset
                                            ? "bg-white/10 border-white/20"
                                            : "bg-white/5 hover:bg-white/10 border-white/10"
                                            }`}
                                        onClick={() => setActiveArrowPreset(preset.id)}
                                    >
                                        <div className="mb-3 h-10 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center overflow-hidden">
                                            <svg width="180" height="32" viewBox="0 0 180 32" className="opacity-90">
                                                <defs>
                                                    <marker
                                                        id={`editor-arrow-${preset.id}`}
                                                        markerWidth={preset.headSize}
                                                        markerHeight={preset.headSize}
                                                        refX={Math.max(preset.headSize - 1, 4)}
                                                        refY={preset.headSize / 2}
                                                        orient="auto"
                                                    >
                                                        <polygon
                                                            points={preset.markerPoints ?? `0 0, ${preset.headSize} ${preset.headSize / 2}, 0 ${preset.headSize}`}
                                                            fill={isActivePreset ? "#ffffff" : "#facc15"}
                                                        />
                                                    </marker>
                                                </defs>
                                                {preset.outlined && (
                                                    <line
                                                        x1="18"
                                                        y1="16"
                                                        x2="154"
                                                        y2="16"
                                                        stroke="#ffffff"
                                                        strokeWidth={preset.strokeWidth + 3}
                                                        strokeLinecap="round"
                                                        opacity="0.9"
                                                    />
                                                )}
                                                {preset.bend && preset.curveDirection ? (
                                                    <path
                                                        d={`M 20 16 Q 88 ${preset.curveDirection === "left" ? 16 - preset.bend * 0.22 : 16 + preset.bend * 0.22} 154 16`}
                                                        fill="none"
                                                        stroke={isActivePreset ? "#ffffff" : "#facc15"}
                                                        strokeWidth={preset.strokeWidth}
                                                        strokeLinecap={preset.strokeLinecap ?? "round"}
                                                        strokeLinejoin="round"
                                                        markerEnd={`url(#editor-arrow-${preset.id})`}
                                                    />
                                                ) : (
                                                    <line
                                                        x1="18"
                                                        y1="16"
                                                        x2="154"
                                                        y2="16"
                                                        stroke={isActivePreset ? "#ffffff" : "#facc15"}
                                                        strokeWidth={preset.strokeWidth}
                                                        strokeLinecap={preset.strokeLinecap ?? "square"}
                                                        markerEnd={`url(#editor-arrow-${preset.id})`}
                                                        strokeDasharray={preset.id === "brush" ? "5 2" : undefined}
                                                    />
                                                )}
                                            </svg>
                                        </div>
                                        <span className="block text-sm font-semibold text-white mb-1 group-hover:scale-[1.02] transition-transform">
                                            {preset.title}
                                        </span>
                                        <span className="text-[10px] text-white/40">{preset.description}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <p className="text-[10px] text-indigo-300 leading-relaxed font-medium">
                                Elegí un preset y dibujá la flecha sobre la escena. Después se sigue seleccionando, ajustando y borrando como una guía normal.
                            </p>
                        </div>
                    </aside>
                )}

                {/* Panel lateral de Marcos (Estilo Canva) */}
                {activeTool === "frame" && (
                    <aside className="absolute left-24 top-0 bottom-0 z-[100] w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Geometría de Marco</h3>
                            <button onClick={() => setActiveTool("select")} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                                onClick={() => {
                                    setAddFrameTrigger({ type: "circle", timestamp: Date.now() });
                                    setActiveTool("select");
                                }}
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-white/40 group-hover:border-white group-hover:scale-110 transition-all" />
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Circular</span>
                            </button>

                            <button
                                className="aspect-square flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
                                onClick={() => {
                                    setAddFrameTrigger({ type: "square", timestamp: Date.now() });
                                    setActiveTool("select");
                                }}
                            >
                                <div className="w-12 h-12 rounded-lg border-2 border-white/40 group-hover:border-white group-hover:scale-110 transition-all" />
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Cuadrado</span>
                            </button>
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <p className="text-[10px] text-indigo-300 leading-relaxed font-medium">
                                <span className="font-bold">Info:</span> Inserta un marco para proyectar otras escenas 360 o capturas dentro de él.
                            </p>
                        </div>
                    </aside>
                )}

                {/* Panel lateral de Galería de Assets (D&D) */}
                {activeTool === "image" && (
                    <aside className="absolute left-24 top-0 bottom-0 z-[100] w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Galería de Assets</h3>
                            <button onClick={() => setActiveTool("select")} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {projectScenes.length > 0 ? (
                                projectScenes.filter(s => s.id !== scene.id).map((item) => (
                                    <div
                                        key={item.id}
                                        draggable="true"
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData("application/json", JSON.stringify({
                                                id: item.id,
                                                sceneKey: getProjectSceneKey(item),
                                                url: item.imageUrl,
                                                type: "scene-asset"
                                            }));
                                        }}
                                        className="relative aspect-video rounded-xl border border-white/10 bg-white/5 overflow-hidden group cursor-grab active:cursor-grabbing hover:border-white/30 transition-all shadow-inner"
                                    >
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">Sin imagen</div>
                                        )}
                                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] text-white/70 font-bold uppercase tracking-wider">
                                            {item.category || "360"}
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                            {item.title || "Sin nombre"}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-[10px] text-white/40 italic">No hay assets en la galería</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] text-emerald-300 leading-relaxed font-medium italic">
                                Info: Arrastra un asset sobre un marco para vincularlo, o suéltalo en la escena libremente.
                            </p>
                        </div>
                    </aside>
                )}

                {activeTool === "poi" && (
                    <aside className="absolute left-24 top-0 bottom-0 z-[100] w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider">Marcadores POI</h3>
                            <button onClick={() => setActiveTool("select")} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border transition-all group ${activePoiVariant === "circle"
                                    ? "bg-white/10 border-white/20"
                                    : "bg-white/5 hover:bg-white/10 border-white/10"
                                    }`}
                                onClick={() => setActivePoiVariant("circle")}
                            >
                                <div className="relative w-14 h-14">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-2 border-white/60 bg-white/10" />
                                    <div className="absolute left-1/2 top-9 -translate-x-1/2 w-1 h-6 bg-white/60 rounded-full" />
                                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-4 h-4 rounded-full border border-white/40 bg-white/10" />
                                </div>
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">Circular</span>
                            </button>

                            <button
                                className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border transition-all group ${activePoiVariant === "square"
                                    ? "bg-white/10 border-white/20"
                                    : "bg-white/5 hover:bg-white/10 border-white/10"
                                    }`}
                                onClick={() => setActivePoiVariant("square")}
                            >
                                <div className="relative w-14 h-14">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 rounded-xl border-2 border-white/60 bg-white/10" />
                                    <div className="absolute left-1/2 top-9 -translate-x-1/2 w-1 h-6 bg-white/60 rounded-full" />
                                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-5 h-3 rounded-full border border-white/40 bg-white/10" />
                                </div>
                                <span className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">Cuadrado</span>
                            </button>
                        </div>

                        <button
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                            onClick={() => {
                                setAddPoiBadgeTrigger({
                                    variant: activePoiVariant,
                                    timestamp: Date.now(),
                                });
                                setActiveTool("select");
                            }}
                        >
                            <span className="block text-sm font-semibold text-white mb-1">Crear sin imagen</span>
                            <span className="text-[10px] text-white/40">Inserta un marcador base listo para mover</span>
                        </button>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {projectScenes.length > 0 ? (
                                projectScenes.map((item) => (
                                    <button
                                        key={`poi-${item.id}`}
                                        className="relative w-full aspect-video rounded-xl border border-white/10 bg-white/5 overflow-hidden group hover:border-white/30 transition-all shadow-inner text-left"
                                        onClick={() => {
                                            setAddPoiBadgeTrigger({
                                                variant: activePoiVariant,
                                                imageUrl: item.imageUrl,
                                                title: item.title,
                                                timestamp: Date.now(),
                                            });
                                            setActiveTool("select");
                                        }}
                                    >
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">Sin imagen</div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-[10px] text-white truncate">
                                            {item.title || "Sin nombre"}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-[10px] text-white/40 italic">No hay imágenes disponibles para POI</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] text-emerald-300 leading-relaxed font-medium">
                                Elegí forma e imagen. El marcador se inserta como una sola pieza: cabeza, tallo y base.
                            </p>
                        </div>
                    </aside>
                )}

                <div ref={containerRef} className="absolute inset-y-0 left-24 right-0">
                    <div ref={viewerRef} className="h-full w-full" />

                    <Tour360SceneCanvas
                        activeTool={activeTool}
                        isEditing={isEditing}
                        viewer={viewerInstance}
                        anchorTrigger={anchorTrigger}
                        fixTrigger={fixTrigger}
                        selectAllTrigger={selectAllTrigger}
                        deselectAllTrigger={deselectAllTrigger}
                        planImageUrl={currentPlanImageUrl}
                        onStateChange={handleCanvasStateChange}
                        initialAnchoredLines={canvasState.anchoredLines}
                        initialAnchoredDstNodes={canvasState.anchoredDstNodes}
                        initialActiveOverlay={canvasState.activeOverlay}
                        initialIsFixed={canvasState.isFixed}
                        initialTexts={canvasState.texts}
                        initialAnchoredTexts={canvasState.anchoredTexts}
                        initialFrames={canvasState.frames}
                        initialAnchoredFrames={canvasState.anchoredFrames}
                        initialImages={canvasState.images}
                        initialAnchoredImages={canvasState.anchoredImages}
                        initialPoiBadges={canvasState.poiBadges}
                        initialAnchoredPoiBadges={canvasState.anchoredPoiBadges}
                        initialFreehandStrokes={canvasState.freehandStrokes}
                        addTextTrigger={addTextTrigger}
                        activeArrowPreset={activeArrowPreset}
                        addFrameTrigger={addFrameTrigger}
                        addPoiBadgeTrigger={addPoiBadgeTrigger}
                        onNavigate={async (target) => {
                            // 1. Auto-guardado SILENCIOSO (no cierra el editor)
                            await saveCalibrationSilent();

                            // 2. Navegar a la escena destino
                            const resolvedTargetId = resolveTargetSceneId(target);
                            if (!resolvedTargetId) {
                                console.warn(`[Tour] Escena destino no encontrada. targetSceneKey=${target.sceneKey ?? "n/a"} targetSceneId=${target.sceneId ?? "n/a"}`);
                                return;
                            }
                            onNavigate?.(resolvedTargetId);
                        }}
                        onDropAsset={(asset) => {
                            console.log("Asset soltado en editor:", asset);
                        }}
                    />

                    <div className="pointer-events-none absolute bottom-4 left-4 z-30 space-y-2">
                        <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur-xl">
                            Herramienta activa: <span className="font-semibold text-white">{activeTool}</span>
                        </div>

                        <div className="rounded-xl border border-emerald-900/40 bg-black/80 px-3 py-2 text-xs text-white/80 backdrop-blur-xl flex flex-col gap-1">
                            <div>
                                <span className="text-[#ec4899] font-bold">{canvasState.selectedLineIds?.length ?? 0}</span> seleccionadas
                            </div>
                            <div>
                                <span className="text-[#22c55e] font-bold">{canvasState.anchoredLines?.length ?? 0}</span> ancladas
                            </div>
                            <div>
                                <span className="text-[#60a5fa] font-bold">{canvasState.fixedLineIds?.length ?? 0}</span> fijadas
                            </div>
                            <div>
                                Total: <span className="font-bold">{canvasState.lines?.length ?? 0}</span> dibujadas
                            </div>
                        </div>
                    </div>
                </div>

                {showPlanosGallery && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
                        <div className="w-full max-w-4xl p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white">Galería de Planos</h3>
                                <button
                                    onClick={() => setShowPlanosGallery(false)}
                                    className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <PlanGalleryPicker
                                proyectoId={proyectoId}
                                items={planGalleryItems as any}
                                onSelect={(item) => {
                                    setPlanImageUrl(item.imageUrl ?? null);
                                    setCalibSaved(false);
                                    onSelectPlan?.(item);
                                    setShowPlanosGallery(false);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

function ToolButton({
    label,
    active,
    onClick,
    disabled = false,
    title,
    icon,
    className: extraClassName,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={[
                "w-full rounded-2xl border px-2 py-4 text-[11px] font-bold transition-all duration-200",
                disabled
                    ? "border-transparent bg-white/5 text-white/30 cursor-not-allowed opacity-50"
                    : active
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                        : "border-white/5 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/20",
                extraClassName ?? "",
            ].join(" ")}
        >
            {icon && <span className="flex justify-center mb-1">{icon}</span>}
            {label}
        </button>
    );
}

export default TourSceneOverlayEditor;
