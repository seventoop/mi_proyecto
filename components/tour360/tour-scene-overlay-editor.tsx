"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Check,
    Eye,
    FlipHorizontal2,
    FlipVertical2,
    Grid3x3,
    Layers,
    Loader2,
    Lock,
    Magnet,
    Move,
    Pencil,
    Redo2,
    RefreshCcw,
    ScanLine,
    Type,
    Undo2,
    Unlock,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MasterplanUnit } from "@/lib/masterplan-store";
import type { SvgViewBox } from "@/lib/geo-projection";
import Viewer360LotesOverlay from "@/components/masterplan/viewer360-lotes-overlay";
import PlanGalleryPicker, { type PlanGalleryItem } from "@/components/plan-gallery/plan-gallery-picker";
import {
    normalizeSceneOverlay,
    type NormalizedSceneOverlayCalibration,
    type SceneOverlayCalibration,
} from "@/lib/tour-overlay";

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
        masterplanOverlay?: (SceneOverlayCalibration & { imageUrl?: string; selectedPlanId?: string }) | null;
    };
    units: MasterplanUnit[];
    overlayBounds: [[number, number], [number, number]];
    overlayRotation: number;
    svgViewBox: SvgViewBox;
    planGalleryItems: PlanGalleryItem[];
    onPlanGalleryItemsChange?: (items: PlanGalleryItem[]) => void;
    onSelectPlan?: (item: PlanGalleryItem) => void;
    onClose: () => void;
    onSaved: (overlay: SceneOverlayCalibration) => void;
}

interface OverlayControlsProps {
    proyectoId: string;
    scene: TourSceneOverlayEditorProps["scene"];
    showOverlay: boolean;
    altitudM: number;
    imageHeading: number;
    latOffset: number;
    lngOffset: number;
    planRotation: number;
    planScale: number;
    planScaleX: number;
    planScaleY: number;
    opacity: number;
    showLabels: boolean;
    showPerimeter: boolean;
    cleanMode: boolean;
    transformLocked: boolean;
    snapEnabled: boolean;
    alignmentGuides: boolean;
    flipX: boolean;
    flipY: boolean;
    onToggle: () => void;
    onAltChange: (value: number) => void;
    onHeadingChange: (value: number) => void;
    onLatOffsetChange: (value: number) => void;
    onLngOffsetChange: (value: number) => void;
    onArrowStep: (dx: number, dy: number) => void;
    onPlanRotChange: (value: number) => void;
    onPlanScaleChange: (value: number) => void;
    onPlanScaleXChange: (value: number) => void;
    onPlanScaleYChange: (value: number) => void;
    onOpacityChange: (value: number) => void;
    onShowLabelsChange: (value: boolean) => void;
    onShowPerimeterChange: (value: boolean) => void;
    onCleanModeChange: (value: boolean) => void;
    onTransformLockedChange: (value: boolean) => void;
    onSnapEnabledChange: (value: boolean) => void;
    onAlignmentGuidesChange: (value: boolean) => void;
    onFlipX: () => void;
    onFlipY: () => void;
    onResetPosition: () => void;
    onResetRotation: () => void;
    onResetScale: () => void;
    onResetAxisScale: () => void;
    onResetAll: () => void;
    onCenterPlan: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onSave: () => void;
    isSaving: boolean;
    saved: boolean;
    isEditing: boolean;
    planGalleryItems: PlanGalleryItem[];
    onPlanGalleryItemsChange?: (items: PlanGalleryItem[]) => void;
    onSelectPlan?: (item: PlanGalleryItem) => void;
    onEnterEdit: () => void;
    onExitEdit: () => void;
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
const SNAP_ROTATION = 1;
const SNAP_SCALE = 0.01;
const SNAP_OFFSET = 1;
const SNAP_OPACITY = 0.01;
const MIN_PLAN_SCALE = 0.05;
const MAX_HISTORY = 80;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

export default function TourSceneOverlayEditor({
    proyectoId,
    scene,
    units,
    overlayBounds,
    overlayRotation,
    svgViewBox,
    planGalleryItems,
    onPlanGalleryItemsChange,
    onSelectPlan,
    onClose,
    onSaved,
}: TourSceneOverlayEditorProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<any>(null);

    const initial = useMemo(() => normalizeSceneOverlay(scene.masterplanOverlay), [scene.masterplanOverlay]);
    const [draft, setDraft] = useState<NormalizedSceneOverlayCalibration>(initial);
    const [isLoading, setIsLoading] = useState(true);
    const [viewerReady, setViewerReady] = useState(false);
    const [isSavingCalib, setIsSavingCalib] = useState(false);
    const [calibSaved, setCalibSaved] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [undoStack, setUndoStack] = useState<NormalizedSceneOverlayCalibration[]>([]);
    const [redoStack, setRedoStack] = useState<NormalizedSceneOverlayCalibration[]>([]);
    const draftRef = useRef(draft);

    useEffect(() => {
        draftRef.current = draft;
    }, [draft]);

    useEffect(() => {
        setDraft(initial);
        setUndoStack([]);
        setRedoStack([]);
        setCalibSaved(false);
    }, [initial]);

    const commitDraft = useCallback((
        updater: Partial<SceneOverlayCalibration> | ((prev: NormalizedSceneOverlayCalibration) => SceneOverlayCalibration),
        options?: { recordHistory?: boolean }
    ) => {
        setDraft((prev) => {
            const next = normalizeSceneOverlay(
                typeof updater === "function" ? updater(prev) : { ...prev, ...updater }
            );
            if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
            if (options?.recordHistory !== false) {
                setUndoStack((stack) => [...stack.slice(-(MAX_HISTORY - 1)), prev]);
                setRedoStack([]);
            }
            setCalibSaved(false);
            return next;
        });
    }, []);

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

                instanceRef.current.on("load", () => setViewerReady(true));
            } catch (err) {
                console.error("[TourSceneOverlayEditor] Pannellum error", err);
            }
        });

        return () => {
            setViewerReady(false);
            try { instanceRef.current?.destroy(); } catch {}
            instanceRef.current = null;
        };
    }, [scene.imageUrl]);

    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        const handleWheel = (e: WheelEvent) => {
            if (!instanceRef.current) return;
            e.preventDefault();
            e.stopPropagation();

            if (isEditing && !draftRef.current.transformLocked) {
                const factor = e.deltaY > 0 ? 1.08 : 0.925;
                commitDraft((prev) => ({
                    ...prev,
                    altitudM: Math.max(10, Math.round(prev.altitudM * factor)),
                }));
                return;
            }

            const currentFov = instanceRef.current.getHfov();
            const delta = e.deltaY > 0 ? 5 : -5;
            instanceRef.current.setHfov(currentFov + delta);
        };
        el.addEventListener("wheel", handleWheel as any, { capture: true, passive: false });
        return () => el.removeEventListener("wheel", handleWheel as any, { capture: true } as any);
    }, [commitDraft, isEditing]);

    const arrowStep = useCallback((screenDx: number, screenDy: number, stepM: number) => {
        const viewer = instanceRef.current;
        if (!viewer || draftRef.current.transformLocked) return;
        const DEG = Math.PI / 180;
        const viewYaw = (() => { try { return viewer.getYaw() as number; } catch { return 0; } })();
        const effHdgRad = (draftRef.current.imageHeading + viewYaw) * DEG;
        const north_m = (screenDx * (-Math.sin(effHdgRad)) + screenDy * (-Math.cos(effHdgRad))) * stepM;
        const east_m = (screenDx * (Math.cos(effHdgRad)) + screenDy * (-Math.sin(effHdgRad))) * stepM;

        commitDraft((prev) => ({
            ...prev,
            latOffset: roundIfSnap(prev.latOffset - north_m, SNAP_OFFSET),
            lngOffset: roundIfSnap(prev.lngOffset - east_m, SNAP_OFFSET),
        }));
    }, [commitDraft, roundIfSnap]);

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

    const saveCalibration = useCallback(async () => {
        setIsSavingCalib(true);
        const nextOverlay: SceneOverlayCalibration = { ...draftRef.current };
        const isTempScene = scene.id.startsWith("scene-");
        let persistedOverlay: SceneOverlayCalibration = nextOverlay;

        try {
            if (process.env.NODE_ENV !== "production") {
                console.debug("[tour-overlay] draft-before-save", draftRef.current);
                console.debug("[tour-overlay] payload", nextOverlay);
            }
            if (!isTempScene) {
                const res = await fetch(`/api/tours/scenes/${scene.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ masterplanOverlay: nextOverlay }),
                });
                if (!res.ok) throw new Error("Error al guardar");
                const savedScene = await res.json();
                persistedOverlay = savedScene?.masterplanOverlay ?? nextOverlay;
                if (process.env.NODE_ENV !== "production") {
                    console.debug("[tour-overlay] persisted-response", persistedOverlay);
                }
            }
            setCalibSaved(true);
            onSaved(persistedOverlay);
            toast.success("Alineacion guardada");
        } catch {
            toast.error("No se pudo guardar la alineacion");
        } finally {
            setIsSavingCalib(false);
        }
    }, [onSaved, scene.id]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/90">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg">360</span>
                    <span className="text-sm font-medium text-white">{scene.title || "Imagen sin titulo"}</span>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300">Editor</span>
                </div>
                <button onClick={onClose} className="rounded-xl p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="relative flex-1 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                    </div>
                )}

                <div ref={viewerRef} className="h-full w-full" />

                {viewerReady && draft.isVisible && (
                    <Viewer360LotesOverlay
                        viewer={instanceRef.current}
                        units={units}
                        overlayBounds={overlayBounds}
                        overlayRotation={overlayRotation}
                        svgViewBox={svgViewBox}
                        camLat={camLat}
                        camLng={camLng}
                        camAlt={draft.altitudM}
                        imageHeading={draft.imageHeading}
                        latOffset={draft.latOffset}
                        lngOffset={draft.lngOffset}
                        planRotation={draft.planRotation}
                        planScale={draft.planScale}
                        planScaleX={draft.planScaleX}
                        planScaleY={draft.planScaleY}
                        pitchBias={draft.pitchBias}
                        cameraRoll={draft.cameraRoll}
                        opacity={draft.opacity}
                        showLabels={draft.showLabels}
                        showPerimeter={draft.showPerimeter}
                        cleanMode={draft.cleanMode}
                        transformLocked={draft.transformLocked}
                        alignmentGuides={draft.alignmentGuides}
                        flipX={draft.flipX}
                        flipY={draft.flipY}
                        isEditing={isEditing}
                        onEnterEdit={() => setIsEditing(true)}
                        onExitEdit={() => setIsEditing(false)}
                        onParamsChange={({ latOffset, lngOffset, camAlt, imageHeading, planRotation, planScale }) => {
                            commitDraft((prev) => ({
                                ...prev,
                                latOffset: roundIfSnap(latOffset, SNAP_OFFSET),
                                lngOffset: roundIfSnap(lngOffset, SNAP_OFFSET),
                                altitudM: camAlt,
                                imageHeading,
                                planRotation: roundIfSnap(planRotation, SNAP_ROTATION),
                                planScale: Math.max(MIN_PLAN_SCALE, roundIfSnap(planScale, SNAP_SCALE)),
                            }));
                        }}
                    />
                )}

                <OverlayControls
                    proyectoId={proyectoId}
                    scene={scene}
                    showOverlay={draft.isVisible}
                    altitudM={draft.altitudM}
                    imageHeading={draft.imageHeading}
                    latOffset={draft.latOffset}
                    lngOffset={draft.lngOffset}
                    planRotation={draft.planRotation}
                    planScale={draft.planScale}
                    planScaleX={draft.planScaleX}
                    planScaleY={draft.planScaleY}
                    opacity={draft.opacity}
                    showLabels={draft.showLabels}
                    showPerimeter={draft.showPerimeter}
                    cleanMode={draft.cleanMode}
                    transformLocked={draft.transformLocked}
                    snapEnabled={draft.snapEnabled}
                    alignmentGuides={draft.alignmentGuides}
                    flipX={draft.flipX}
                    flipY={draft.flipY}
                    onToggle={() => commitDraft((prev) => ({ ...prev, isVisible: !prev.isVisible }))}
                    onAltChange={(value) => commitDraft({ altitudM: Math.max(10, value) })}
                    onHeadingChange={(value) => commitDraft({ imageHeading: value })}
                    onLatOffsetChange={(value) => commitDraft({ latOffset: roundIfSnap(value, SNAP_OFFSET) })}
                    onLngOffsetChange={(value) => commitDraft({ lngOffset: roundIfSnap(value, SNAP_OFFSET) })}
                    onArrowStep={(dx, dy) => arrowStep(dx, dy, MOVE_STEP)}
                    onPlanRotChange={(value) => commitDraft({ planRotation: roundIfSnap(value, SNAP_ROTATION) })}
                    onPlanScaleChange={(value) => commitDraft({ planScale: clamp(roundIfSnap(value, SNAP_SCALE), MIN_PLAN_SCALE, 5) })}
                    onPlanScaleXChange={(value) => commitDraft({ planScaleX: clamp(roundIfSnap(value, SNAP_SCALE), 0.1, 5) })}
                    onPlanScaleYChange={(value) => commitDraft({ planScaleY: clamp(roundIfSnap(value, SNAP_SCALE), 0.1, 5) })}
                    onOpacityChange={(value) => commitDraft({ opacity: clamp(roundIfSnap(value, SNAP_OPACITY), 0.1, 1) })}
                    onShowLabelsChange={(value) => commitDraft({ showLabels: value })}
                    onShowPerimeterChange={(value) => commitDraft({ showPerimeter: value })}
                    onCleanModeChange={(value) => commitDraft({ cleanMode: value })}
                    onTransformLockedChange={(value) => commitDraft({ transformLocked: value })}
                    onSnapEnabledChange={(value) => commitDraft({ snapEnabled: value })}
                    onAlignmentGuidesChange={(value) => commitDraft({ alignmentGuides: value })}
                    onFlipX={() => commitDraft((prev) => ({ ...prev, flipX: !prev.flipX }))}
                    onFlipY={() => commitDraft((prev) => ({ ...prev, flipY: !prev.flipY }))}
                    onResetPosition={() => commitDraft({ latOffset: 0, lngOffset: 0 })}
                    onResetRotation={() => commitDraft({ planRotation: 0 })}
                    onResetScale={() => commitDraft({ planScale: 1, flipX: false, flipY: false })}
                    onResetAxisScale={() => commitDraft({ planScaleX: 1, planScaleY: 1 })}
                    onResetAll={() => commitDraft(initial)}
                    onCenterPlan={() => commitDraft({ latOffset: 0, lngOffset: 0 })}
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={undoStack.length > 0}
                    canRedo={redoStack.length > 0}
                    onSave={saveCalibration}
                    isSaving={isSavingCalib}
                    saved={calibSaved}
                    isEditing={isEditing}
                    planGalleryItems={planGalleryItems}
                    onPlanGalleryItemsChange={onPlanGalleryItemsChange}
                    onSelectPlan={onSelectPlan}
                    onEnterEdit={() => setIsEditing(true)}
                    onExitEdit={() => setIsEditing(false)}
                />
            </div>
        </div>
    );
}

function OverlayControls({
    proyectoId,
    scene,
    showOverlay,
    altitudM,
    imageHeading,
    latOffset,
    lngOffset,
    planRotation,
    planScale,
    planScaleX,
    planScaleY,
    opacity,
    showLabels,
    showPerimeter,
    cleanMode,
    transformLocked,
    snapEnabled,
    alignmentGuides,
    flipX,
    flipY,
    onToggle,
    onAltChange,
    onHeadingChange,
    onLatOffsetChange,
    onLngOffsetChange,
    onArrowStep,
    onPlanRotChange,
    onPlanScaleChange,
    onPlanScaleXChange,
    onPlanScaleYChange,
    onOpacityChange,
    onShowLabelsChange,
    onShowPerimeterChange,
    onCleanModeChange,
    onTransformLockedChange,
    onSnapEnabledChange,
    onAlignmentGuidesChange,
    onFlipX,
    onFlipY,
    onResetPosition,
    onResetRotation,
    onResetScale,
    onResetAxisScale,
    onResetAll,
    onCenterPlan,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onSave,
    isSaving,
    saved,
    planGalleryItems,
    onPlanGalleryItemsChange,
    onSelectPlan,
    isEditing,
    onEnterEdit,
    onExitEdit,
}: OverlayControlsProps) {
    const [showPlanGallery, setShowPlanGallery] = useState(false);
    const sign = (n: number) => n >= 0 ? `+${n}` : `${n}`;

    if (!isEditing) {
        return (
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-1.5 shadow-xl backdrop-blur-xl">
                <button onClick={onToggle} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all", showOverlay ? "bg-indigo-600 text-white" : "text-white/60 hover:bg-white/10 hover:text-white")}>
                    <Layers className="h-3.5 w-3.5" />
                    {showOverlay ? "Lotes ON" : "Lotes OFF"}
                </button>
                <div className="h-4 w-px bg-white/10" />
                <button onClick={onEnterEdit} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/60 transition-all hover:bg-white/10 hover:text-white">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar overlay
                </button>
            </div>
        );
    }

    return (
        <div className="absolute bottom-8 right-4 top-16 z-[9999] flex w-[360px] flex-col rounded-2xl border border-white/10 bg-black/85 shadow-2xl backdrop-blur-2xl pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                    <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                        <Pencil className="h-4 w-4 text-indigo-400" />
                        Editor de alineacion
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">Flechas mueven, Shift acelera y Alt/Ctrl ajusta fino.</p>
                </div>
                <button onClick={onExitEdit} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                            <Move className="h-3.5 w-3.5" />
                            Transformacion
                        </h4>
                        <button onClick={() => onTransformLockedChange(!transformLocked)} className={cn("rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors", transformLocked ? "border-amber-400/40 bg-amber-500/15 text-amber-200" : "border-white/10 text-slate-300 hover:bg-white/10")}>
                            {transformLocked ? <Lock className="mr-1 inline h-3 w-3" /> : <Unlock className="mr-1 inline h-3 w-3" />}
                            {transformLocked ? "Bloqueado" : "Editable"}
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ToggleButton active={flipX} onClick={onFlipX} label="Flip H" icon={<FlipHorizontal2 className="mr-1 inline h-3.5 w-3.5" />} />
                        <ToggleButton active={flipY} onClick={onFlipY} label="Flip V" icon={<FlipVertical2 className="mr-1 inline h-3.5 w-3.5" />} />
                        <button onClick={onCenterPlan} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10">
                            <ScanLine className="mr-1 inline h-3.5 w-3.5" /> Centrar
                        </button>
                        <button onClick={onResetAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10">
                            <RefreshCcw className="mr-1 inline h-3.5 w-3.5" /> Reset total
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumericField label="Rotacion" value={Math.round(planRotation)} step={1} onChange={onPlanRotChange} />
                        <NumericField label="Escala" value={Number(planScale.toFixed(3))} step={0.01} onChange={onPlanScaleChange} />
                        <NumericField label="Offset X" value={Math.round(lngOffset)} step={1} onChange={onLngOffsetChange} />
                        <NumericField label="Offset Y" value={Math.round(latOffset)} step={1} onChange={onLatOffsetChange} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={onResetPosition} className="rounded-lg border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/10">Reset pos</button>
                        <button onClick={onResetRotation} className="rounded-lg border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/10">Reset giro</button>
                        <button onClick={onResetScale} className="rounded-lg border border-white/10 px-2 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/10">Reset escala</button>
                    </div>

                    {/* ── Escala por eje ────────────────────────────────────────── */}
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300/80">
                                Proporcion por eje
                            </p>
                            <button onClick={onResetAxisScale} className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400 hover:bg-white/10">
                                Reset ejes
                            </button>
                        </div>
                        <p className="text-[10px] leading-relaxed text-slate-500">
                            Corrige el cruce diagonal entre esquinas. Ajusta la proporcion del plano en cada eje geografico por separado.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <NumericField label="Escala E-O" value={Number(planScaleX.toFixed(3))} step={0.01} onChange={onPlanScaleXChange} />
                            <NumericField label="Escala N-S" value={Number(planScaleY.toFixed(3))} step={0.01} onChange={onPlanScaleYChange} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>E-O</span>
                                <span className="font-mono text-indigo-300">{planScaleX.toFixed(3)}</span>
                            </div>
                            <input type="range" min={0.1} max={3} step={0.005} value={planScaleX} onChange={(e) => onPlanScaleXChange(Number(e.target.value))} className="w-full accent-indigo-500" />
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>N-S</span>
                                <span className="font-mono text-indigo-300">{planScaleY.toFixed(3)}</span>
                            </div>
                            <input type="range" min={0.1} max={3} step={0.005} value={planScaleY} onChange={(e) => onPlanScaleYChange(Number(e.target.value))} className="w-full accent-indigo-500" />
                        </div>
                    </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <Eye className="h-3.5 w-3.5" />
                        Visualizacion
                    </h4>
                    <div className="space-y-2">
                        <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                            Opacidad
                            <span className="text-indigo-300">{Math.round(opacity * 100)}%</span>
                        </label>
                        <input type="range" min={0.1} max={1} step={0.01} value={opacity} onChange={(e) => onOpacityChange(Number(e.target.value))} className="w-full accent-indigo-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ToggleButton active={showOverlay} onClick={onToggle} label="Plano" icon={<Layers className="mr-1 inline h-3.5 w-3.5" />} />
                        <ToggleButton active={showLabels} onClick={() => onShowLabelsChange(!showLabels)} label="Numeracion" icon={<Type className="mr-1 inline h-3.5 w-3.5" />} />
                        <ToggleButton active={showPerimeter} onClick={() => onShowPerimeterChange(!showPerimeter)} label="Perimetro" icon={<Grid3x3 className="mr-1 inline h-3.5 w-3.5" />} />
                        <ToggleButton active={cleanMode} onClick={() => onCleanModeChange(!cleanMode)} label="Modo limpio" icon={<ScanLine className="mr-1 inline h-3.5 w-3.5" />} />
                    </div>
                </section>

                <section className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <Pencil className="h-3.5 w-3.5" />
                        Edicion y contenido
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={onUndo} disabled={!canUndo} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40">
                            <Undo2 className="mr-1 inline h-3.5 w-3.5" /> Undo
                        </button>
                        <button onClick={onRedo} disabled={!canRedo} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-40">
                            <Redo2 className="mr-1 inline h-3.5 w-3.5" /> Redo
                        </button>
                    </div>
                    <p className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
                        La numeracion ahora funciona como capa visible independiente. Las marcas de dibujo quedan desacopladas para extenderlas despues sin afectar la calibracion guardada.
                    </p>
                    <button
                        onClick={() => setShowPlanGallery((value) => !value)}
                        className={cn("w-full rounded-xl border px-3 py-2 text-xs font-semibold transition-all", showPlanGallery ? "border-indigo-500 bg-indigo-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white")}
                    >
                        <Grid3x3 className="mr-1 inline h-3.5 w-3.5" />
                        Galeria de planos
                    </button>
                    {showPlanGallery && (
                        <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Modelos disponibles</p>
                            <PlanGalleryPicker
                                proyectoId={proyectoId}
                                items={planGalleryItems}
                                selectedId={scene.masterplanOverlay?.selectedPlanId ?? null}
                                onSelect={(item) => {
                                    onSelectPlan?.(item);
                                    toast.success(`Plano "${item.nombre}" seleccionado`);
                                }}
                                onItemsChange={onPlanGalleryItemsChange}
                                allowUpload={false}
                            />
                        </div>
                    )}
                </section>

                <section className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                    <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        <Magnet className="h-3.5 w-3.5" />
                        Alineacion
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <ToggleButton active={snapEnabled} onClick={() => onSnapEnabledChange(!snapEnabled)} label="Snap" icon={<Magnet className="mr-1 inline h-3.5 w-3.5" />} />
                        <ToggleButton active={alignmentGuides} onClick={() => onAlignmentGuidesChange(!alignmentGuides)} label="Guias" icon={<ScanLine className="mr-1 inline h-3.5 w-3.5" />} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumericField label="Altitud" value={altitudM} step={5} onChange={onAltChange} />
                        <NumericField label="Heading" value={Math.round(imageHeading)} step={1} onChange={onHeadingChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/20 p-3">
                        <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                            <button onClick={() => onArrowStep(0, -1)} className="p-1 text-slate-300 hover:text-indigo-300"><ArrowUp className="h-4 w-4" /></button>
                            <span className="my-0.5 text-[10px] text-slate-400">Y {sign(Math.round(latOffset))}</span>
                            <button onClick={() => onArrowStep(0, 1)} className="p-1 text-slate-300 hover:text-indigo-300"><ArrowDown className="h-4 w-4" /></button>
                        </div>
                        <div className="flex flex-col items-center rounded-lg bg-black/30 p-2">
                            <button onClick={() => onArrowStep(1, 0)} className="p-1 text-slate-300 hover:text-indigo-300"><ArrowRight className="h-4 w-4" /></button>
                            <span className="my-0.5 text-[10px] text-slate-400">X {sign(Math.round(lngOffset))}</span>
                            <button onClick={() => onArrowStep(-1, 0)} className="p-1 text-slate-300 hover:text-indigo-300"><ArrowLeft className="h-4 w-4" /></button>
                        </div>
                    </div>
                </section>

            </div>

            <div className="space-y-2 rounded-b-2xl border-t border-white/10 bg-black/50 p-4">
                <button onClick={onSave} disabled={isSaving} className={cn("flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all", saved ? "bg-green-600 text-white" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 disabled:opacity-50")}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4" /> Guardado</> : "Guardar alineacion"}
                </button>
            </div>
        </div>
    );
}

function NumericField({
    label,
    value,
    step,
    onChange,
}: {
    label: string;
    value: number;
    step: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">{label}</label>
            <input
                type="number"
                value={value}
                step={step}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
        </div>
    );
}

function ToggleButton({
    active,
    onClick,
    label,
    icon,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
    icon: ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={cn("rounded-xl border px-3 py-2 text-xs font-semibold transition-colors", active ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100" : "border-white/10 text-slate-300 hover:bg-white/10")}
        >
            {icon}
            {label}
        </button>
    );
}
