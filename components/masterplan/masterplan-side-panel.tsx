"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, History, MapPin, Maximize2, Tag, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn, formatArea, formatCurrency } from "@/lib/utils";
import { MasterplanUnit, useMasterplanStore } from "@/lib/masterplan-store";
import ReservaModal from "@/components/dashboard/reservas/reserva-modal";
import { generateUnitPDF } from "@/lib/export-utils";
import { getUnidadHistorial } from "@/lib/actions/unidades";
import SharedSidePanel from "./shared-side-panel";

const STATUS_COLORS: Record<MasterplanUnit["estado"], string> = {
    DISPONIBLE: "#10b981",
    BLOQUEADO: "#94a3b8",
    RESERVADA: "#f59e0b",
    VENDIDA: "#ef4444",
    SUSPENDIDO: "#64748b",
};

const STATUS_LABELS: Record<MasterplanUnit["estado"], string> = {
    DISPONIBLE: "Disponible",
    BLOQUEADO: "Bloqueado",
    RESERVADA: "Reservada",
    VENDIDA: "Vendida",
    SUSPENDIDO: "Suspendido",
};

interface SidePanelProps {
    unit: MasterplanUnit;
    modo: "admin" | "public";
    canEdit: boolean;
    onClose: () => void;
}

interface UnitDraft {
    numero: string;
    tipo: string;
    estado: MasterplanUnit["estado"];
    precio: string;
    superficie: string;
    frente: string;
    fondo: string;
    orientacion: string;
    manzanaId: string;
    etapaNombre: string;
    esEsquina: boolean;
}

function toDraft(unit: MasterplanUnit): UnitDraft {
    return {
        numero: unit.numero ?? "",
        tipo: unit.tipo ?? "",
        estado: unit.estado,
        precio: unit.precio != null ? String(unit.precio) : "",
        superficie: unit.superficie != null ? String(unit.superficie) : "",
        frente: unit.frente != null ? String(unit.frente) : "",
        fondo: unit.fondo != null ? String(unit.fondo) : "",
        orientacion: unit.orientacion ?? "",
        manzanaId: unit.manzanaId ?? "",
        etapaNombre: unit.etapaNombre ?? "",
        esEsquina: unit.esEsquina,
    };
}

function parseNullableNumber(value: string) {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

export default function MasterplanSidePanel({ unit, modo, canEdit, onClose }: SidePanelProps) {
    const { comparisonIds, toggleComparison, updateUnitState, units } = useMasterplanStore();
    const isComparing = comparisonIds.includes(unit.id);
    const [isReservaModalOpen, setIsReservaModalOpen] = useState(false);
    const [historial, setHistorial] = useState<any[]>([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [draft, setDraft] = useState<UnitDraft>(() => toDraft(unit));
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        setDraft(toDraft(unit));
        setSaveError(null);
    }, [unit]);

    const manzanaOptions = useMemo(() => {
        const map = new Map<string, { id: string; nombre: string; etapaNombre: string }>();

        units.forEach((item) => {
            if (!item.manzanaId || !item.manzanaNombre) return;
            map.set(item.manzanaId, {
                id: item.manzanaId,
                nombre: item.manzanaNombre,
                etapaNombre: item.etapaNombre ?? "Sin etapa",
            });
        });

        return Array.from(map.values()).sort((a, b) =>
            `${a.etapaNombre}-${a.nombre}`.localeCompare(`${b.etapaNombre}-${b.nombre}`, "es"),
        );
    }, [units]);

    const etapas = useMemo(() => {
        const unique = Array.from(new Set(manzanaOptions.map((option) => option.etapaNombre)));
        return unique.sort((a, b) => a.localeCompare(b, "es"));
    }, [manzanaOptions]);

    const availableManzanas = useMemo(() => {
        if (!draft.etapaNombre) return manzanaOptions;
        return manzanaOptions.filter((option) => option.etapaNombre === draft.etapaNombre);
    }, [draft.etapaNombre, manzanaOptions]);

    const selectedManzana = availableManzanas.find((option) => option.id === draft.manzanaId)
        ?? manzanaOptions.find((option) => option.id === draft.manzanaId)
        ?? null;

    const isDirty = JSON.stringify(draft) !== JSON.stringify(toDraft(unit));

    let internalId: number | undefined;
    try {
        if ((unit as any).coordenadasMasterplan) {
            const coords = JSON.parse((unit as any).coordenadasMasterplan);
            internalId = coords?.internalId;
        }
    } catch {}

    useEffect(() => {
        if (modo !== "admin" || !unit.id) return;

        const fetchHistorial = async () => {
            setLoadingHistorial(true);
            const res = await getUnidadHistorial(unit.id);
            if (res.success && res.data) {
                setHistorial(res.data);
            }
            setLoadingHistorial(false);
        };

        fetchHistorial();
    }, [unit.id, modo]);

    const handleFieldChange = <K extends keyof UnitDraft>(key: K, value: UnitDraft[K]) => {
        setDraft((current) => ({ ...current, [key]: value }));
    };

    const handleEtapaChange = (etapaNombre: string) => {
        const firstManzana = manzanaOptions.find((option) => option.etapaNombre === etapaNombre);
        setDraft((current) => ({
            ...current,
            etapaNombre,
            manzanaId: firstManzana?.id ?? current.manzanaId,
        }));
    };

    const handleManzanaChange = (manzanaId: string) => {
        const manzana = manzanaOptions.find((option) => option.id === manzanaId);
        setDraft((current) => ({
            ...current,
            manzanaId,
            etapaNombre: manzana?.etapaNombre ?? current.etapaNombre,
        }));
    };

    const handleSave = async () => {
        if (!canEdit || isSaving) return;

        const previousEstado = unit.estado;
        const optimisticPatch: Partial<MasterplanUnit> = {
            numero: draft.numero.trim() || unit.numero,
            tipo: draft.tipo.trim() || unit.tipo,
            estado: draft.estado,
            precio: parseNullableNumber(draft.precio),
            superficie: parseNullableNumber(draft.superficie),
            frente: parseNullableNumber(draft.frente),
            fondo: parseNullableNumber(draft.fondo),
            orientacion: draft.orientacion.trim() || null,
            esEsquina: draft.esEsquina,
            manzanaId: draft.manzanaId || undefined,
            manzanaNombre: selectedManzana?.nombre ?? unit.manzanaNombre,
            etapaNombre: draft.etapaNombre || selectedManzana?.etapaNombre || unit.etapaNombre,
        };

        setSaveError(null);
        setIsSaving(true);
        updateUnitState(unit.id, optimisticPatch);

        try {
            const response = await fetch(`/api/unidades/${unit.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    numero: draft.numero.trim(),
                    tipo: draft.tipo.trim(),
                    estado: draft.estado,
                    previousEstado: previousEstado,
                    precio: parseNullableNumber(draft.precio),
                    superficie: parseNullableNumber(draft.superficie),
                    frente: parseNullableNumber(draft.frente),
                    fondo: parseNullableNumber(draft.fondo),
                    orientacion: draft.orientacion.trim() || null,
                    esEsquina: draft.esEsquina,
                    manzanaId: draft.manzanaId || null,
                }),
            });

            if (!response.ok) {
                throw new Error("No se pudo guardar el lote");
            }

            const saved = await response.json();
            updateUnitState(unit.id, {
                numero: saved.numero,
                tipo: saved.tipo,
                estado: saved.estado,
                precio: saved.precio,
                superficie: saved.superficie,
                frente: saved.frente,
                fondo: saved.fondo,
                orientacion: saved.orientacion,
                esEsquina: saved.esEsquina,
                manzanaId: saved.manzana?.id ?? undefined,
                manzanaNombre: saved.manzana?.nombre ?? null,
                etapaId: saved.manzana?.etapa?.id ?? undefined,
                etapaNombre: saved.manzana?.etapa?.nombre ?? null,
            });
            setDraft(toDraft({
                ...unit,
                ...saved,
                manzanaId: saved.manzana?.id ?? undefined,
                manzanaNombre: saved.manzana?.nombre ?? undefined,
                etapaId: saved.manzana?.etapa?.id ?? undefined,
                etapaNombre: saved.manzana?.etapa?.nombre ?? undefined,
            }));
        } catch (error) {
            updateUnitState(unit.id, {
                numero: unit.numero,
                tipo: unit.tipo,
                estado: unit.estado,
                precio: unit.precio,
                superficie: unit.superficie,
                frente: unit.frente,
                fondo: unit.fondo,
                orientacion: unit.orientacion,
                esEsquina: unit.esEsquina,
                manzanaId: unit.manzanaId,
                manzanaNombre: unit.manzanaNombre,
                etapaNombre: unit.etapaNombre,
            });
            setSaveError(error instanceof Error ? error.message : "No se pudo guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const quickStats = [
        { label: "Superficie", value: formatArea(unit.superficie), icon: Maximize2 },
        { label: "Precio", value: unit.precio != null ? formatCurrency(unit.precio, unit.moneda || "USD") : "—", icon: Tag },
        { label: "Etapa", value: unit.etapaNombre || "—", icon: MapPin },
        { label: "Manzana", value: unit.manzanaNombre || "—", icon: MapPin },
    ];

    return (
        <>
            <SharedSidePanel
                title={`Lote ${unit.numero}`}
                subtitle={modo === "admin" && internalId != null ? `ID interno #${internalId}` : unit.tipo || "Unidad"}
                tone="light"
                onClose={onClose}
                icon={(
                    <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm text-white"
                        style={{ backgroundColor: STATUS_COLORS[unit.estado] }}
                    >
                        {modo === "admin" && internalId != null ? `#${internalId}` : (unit.numero.split("-")[1] || unit.numero)}
                    </div>
                )}
                footer={canEdit ? (
                    <div className="space-y-2">
                        {saveError ? <p className="text-xs text-rose-500">{saveError}</p> : null}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setDraft(toDraft(unit))}
                                disabled={!isDirty || isSaving}
                                className="flex-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isDirty || isSaving}
                                className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "Guardando..." : "Guardar cambios"}
                            </button>
                        </div>
                    </div>
                ) : null}
            >
                <div className="space-y-5 p-4">
                    <div className="grid grid-cols-2 gap-2.5">
                        {quickStats.map((stat) => (
                            <div key={stat.label} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                                <div className="mb-0.5 flex items-center gap-1.5">
                                    <stat.icon className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400">{stat.label}</span>
                                </div>
                                <p className="truncate text-sm font-bold text-slate-700 dark:text-white">{stat.value}</p>
                            </div>
                        ))}
                    </div>

                    {canEdit ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Edición del lote
                                </h4>
                                <span
                                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                                    style={{ backgroundColor: `${STATUS_COLORS[draft.estado]}15`, color: STATUS_COLORS[draft.estado] }}
                                >
                                    {STATUS_LABELS[draft.estado]}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Número</label>
                                    <input
                                        value={draft.numero}
                                        onChange={(event) => handleFieldChange("numero", event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Tipo</label>
                                    <input
                                        value={draft.tipo}
                                        onChange={(event) => handleFieldChange("tipo", event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-[11px] font-semibold text-slate-500">Estado</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {(Object.keys(STATUS_LABELS) as MasterplanUnit["estado"][]).map((estado) => (
                                            <button
                                                key={estado}
                                                onClick={() => handleFieldChange("estado", estado)}
                                                className={cn(
                                                    "rounded-xl border px-2 py-2 text-[11px] font-bold uppercase transition-all",
                                                    draft.estado === estado
                                                        ? "text-white border-transparent"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-current dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                                                )}
                                                style={draft.estado === estado ? { backgroundColor: STATUS_COLORS[estado] } : { color: STATUS_COLORS[estado] }}
                                            >
                                                {STATUS_LABELS[estado]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Precio</label>
                                    <input
                                        value={draft.precio}
                                        onChange={(event) => handleFieldChange("precio", event.target.value)}
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Superficie</label>
                                    <input
                                        value={draft.superficie}
                                        onChange={(event) => handleFieldChange("superficie", event.target.value)}
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Etapa</label>
                                    <select
                                        value={draft.etapaNombre}
                                        onChange={(event) => handleEtapaChange(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <option value="">Sin etapa</option>
                                        {etapas.map((etapa) => (
                                            <option key={etapa} value={etapa}>{etapa}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Manzana</label>
                                    <select
                                        value={draft.manzanaId}
                                        onChange={(event) => handleManzanaChange(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    >
                                        <option value="">Sin manzana</option>
                                        {availableManzanas.map((manzana) => (
                                            <option key={manzana.id} value={manzana.id}>{manzana.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Frente</label>
                                    <input
                                        value={draft.frente}
                                        onChange={(event) => handleFieldChange("frente", event.target.value)}
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-500">Fondo</label>
                                    <input
                                        value={draft.fondo}
                                        onChange={(event) => handleFieldChange("fondo", event.target.value)}
                                        inputMode="decimal"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <label className="text-[11px] font-semibold text-slate-500">Orientación</label>
                                    <input
                                        value={draft.orientacion}
                                        onChange={(event) => handleFieldChange("orientacion", event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={draft.esEsquina}
                                    onChange={(event) => handleFieldChange("esEsquina", event.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                                Es lote de esquina
                            </label>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {unit.estado === "DISPONIBLE" && (
                                <button
                                    onClick={() => setIsReservaModalOpen(true)}
                                    className="col-span-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all gradient-brand hover:shadow-glow-lg"
                                >
                                    Reservar unidad
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={() => generateUnitPDF(unit)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Ficha PDF
                        </button>
                        <button
                            onClick={() => toggleComparison(unit.id)}
                            className={cn(
                                "flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-medium transition-all",
                                isComparing
                                    ? "bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/30"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                            )}
                        >
                            {isComparing ? "✓ Comparar" : "+ Comparar"}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detalles técnicos</h4>
                        <div className="space-y-1.5">
                            {[
                                { label: "Tipo", value: unit.tipo || "—" },
                                { label: "Frente", value: unit.frente != null ? formatArea(unit.frente, "m") : "—" },
                                { label: "Fondo", value: unit.fondo != null ? formatArea(unit.fondo, "m") : "—" },
                                { label: "Orientación", value: unit.orientacion || "—" },
                                { label: "Esquina", value: unit.esEsquina ? "Sí" : "No" },
                                { label: "ID Interno", value: internalId != null ? `#${internalId}` : "—" },
                                { label: "ID Técnico", value: unit.id.slice(-8).toUpperCase() },
                            ].map((detail) => (
                                <div key={detail.label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5 dark:border-slate-800">
                                    <span className="text-xs text-slate-400">{detail.label}</span>
                                    <span className="max-w-[55%] truncate text-right text-xs font-medium text-slate-700 dark:text-slate-200">
                                        {detail.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {modo === "admin" && (
                        <div className="space-y-2">
                            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <History className="h-3 w-3" />
                                Historial real
                            </h4>
                            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                                {loadingHistorial ? (
                                    <div className="flex flex-col items-center gap-2 py-8">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                                        <p className="text-[10px] text-slate-500">Cargando eventos...</p>
                                    </div>
                                ) : historial.length === 0 ? (
                                    <p className="py-4 text-center text-[10px] italic text-slate-400">No hay cambios registrados todavía.</p>
                                ) : (
                                    historial.map((entry, index) => {
                                        const previousStatus = entry.anterior as MasterplanUnit["estado"];
                                        const nextStatus = entry.nuevo as MasterplanUnit["estado"];

                                        return (
                                        <div key={index} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-700/50 dark:bg-slate-800/40">
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}
                                                </span>
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-brand-500">
                                                    <User className="h-2.5 w-2.5" />
                                                    {entry.usuario?.nombre || "Sistema"}
                                                </span>
                                            </div>
                                            <div className="mb-1 flex items-center gap-1.5">
                                                <span
                                                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                                                    style={{ backgroundColor: `${STATUS_COLORS[previousStatus]}10`, color: STATUS_COLORS[previousStatus] }}
                                                >
                                                    {previousStatus}
                                                </span>
                                                <span className="text-[10px] text-slate-400">→</span>
                                                <span
                                                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                                                    style={{ backgroundColor: `${STATUS_COLORS[nextStatus]}10`, color: STATUS_COLORS[nextStatus] }}
                                                >
                                                    {nextStatus}
                                                </span>
                                            </div>
                                            {entry.motivo ? <p className="text-[10px] leading-tight text-slate-500">{entry.motivo}</p> : null}
                                        </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </SharedSidePanel>

            <ReservaModal
                isOpen={isReservaModalOpen}
                onClose={() => setIsReservaModalOpen(false)}
                unidad={{
                    id: unit.id,
                    numero: unit.numero,
                    precio: unit.precio,
                    moneda: unit.moneda,
                }}
                onSuccess={() => {
                    setIsReservaModalOpen(false);
                }}
            />
        </>
    );
}
