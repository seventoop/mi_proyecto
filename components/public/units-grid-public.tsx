"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Hash, MapPin, Maximize2, Search, SlidersHorizontal, Tag } from "lucide-react";

export type PublicUnitItem = {
    id: string;
    numero: string;
    estado: string;
    superficie: number | null;
    precio: number | null;
    moneda: string;
    orientacion: string | null;
    esEsquina: boolean;
    etapaNombre: string | null;
    manzanaNombre: string | null;
};

type EstadoFilter = "TODOS" | "DISPONIBLE" | "RESERVADA" | "VENDIDA" | "BLOQUEADA" | "SUSPENDIDO";
type SortKey =
    | "default"
    | "numero_asc"
    | "precio_asc"
    | "precio_desc"
    | "superficie_asc"
    | "superficie_desc";

interface Props {
    units: PublicUnitItem[];
    slug: string;
    mode?: "compact" | "full";
    pageSize?: number;
    seeAllHref?: string;
}

const ESTADO_TONE: Record<string, { dot: string; chip: string; label: string }> = {
    DISPONIBLE: { dot: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", label: "Disponible" },
    RESERVADA: { dot: "bg-amber-500", chip: "bg-amber-500/15 text-amber-600 border-amber-500/30", label: "Reservado" },
    VENDIDA: { dot: "bg-rose-500", chip: "bg-rose-500/15 text-rose-600 border-rose-500/30", label: "Vendido" },
    BLOQUEADA: { dot: "bg-slate-400", chip: "bg-slate-400/15 text-slate-500 border-slate-400/30", label: "Bloqueado" },
    SUSPENDIDO: { dot: "bg-slate-500", chip: "bg-slate-500/15 text-slate-500 border-slate-500/30", label: "Suspendido" },
};

function formatCurrency(value: number | null, currency = "USD") {
    if (value == null || !Number.isFinite(value)) return "Consultar";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

function formatSurface(value: number | null) {
    if (value == null || !Number.isFinite(value)) return "Consultar";
    const rounded = Math.round(value * 10) / 10;
    const display = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
    return `${display.replace(".", ",")} m²`;
}

function naturalCompareCode(a: string, b: string) {
    return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

export default function UnitsGridPublic({
    units,
    slug,
    mode = "full",
    pageSize = 12,
    seeAllHref,
}: Props) {
    const isCompact = mode === "compact";
    const [estado, setEstado] = useState<EstadoFilter>("TODOS");
    const [sort, setSort] = useState<SortKey>("default");
    const [query, setQuery] = useState("");
    const [visible, setVisible] = useState(pageSize);

    // Reset pagination on any filter/sort/query change
    useEffect(() => {
        setVisible(pageSize);
    }, [estado, sort, query, pageSize]);

    const counts = useMemo(() => {
        const c = { DISPONIBLE: 0, RESERVADA: 0, VENDIDA: 0, BLOQUEADA: 0, SUSPENDIDO: 0 };
        for (const u of units) if ((c as any)[u.estado] != null) (c as any)[u.estado] += 1;
        return c;
    }, [units]);

    const filtered = useMemo(() => {
        let list = units.slice();
        if (estado !== "TODOS") list = list.filter((u) => u.estado === estado);
        const q = query.trim().toLowerCase();
        if (q) {
            list = list.filter((u) =>
                [u.numero, u.etapaNombre, u.manzanaNombre]
                    .filter(Boolean)
                    .some((v) => (v as string).toLowerCase().includes(q)),
            );
        }
        switch (sort) {
            case "numero_asc":
                list.sort((a, b) => naturalCompareCode(a.numero, b.numero));
                break;
            case "precio_asc":
                list.sort((a, b) => (a.precio ?? Infinity) - (b.precio ?? Infinity));
                break;
            case "precio_desc":
                list.sort((a, b) => (b.precio ?? -Infinity) - (a.precio ?? -Infinity));
                break;
            case "superficie_asc":
                list.sort((a, b) => (a.superficie ?? Infinity) - (b.superficie ?? Infinity));
                break;
            case "superficie_desc":
                list.sort((a, b) => (b.superficie ?? -Infinity) - (a.superficie ?? -Infinity));
                break;
            default:
                list.sort((a, b) => {
                    const aDisp = a.estado === "DISPONIBLE" ? 0 : 1;
                    const bDisp = b.estado === "DISPONIBLE" ? 0 : 1;
                    if (aDisp !== bDisp) return aDisp - bDisp;
                    return naturalCompareCode(a.numero, b.numero);
                });
        }
        return list;
    }, [units, estado, sort, query]);

    const shown = isCompact ? filtered.slice(0, pageSize) : filtered.slice(0, visible);
    const hasMore = !isCompact && visible < filtered.length;

    // Build dynamic filter buttons (always show DISPONIBLE/RESERVADA/VENDIDA;
    // BLOQUEADA / SUSPENDIDO only if any exist)
    const filterButtons: Array<{ key: EstadoFilter; label: string; count: number; tone: string }> = [
        { key: "TODOS", label: "Todos", count: units.length, tone: "bg-foreground" },
        { key: "DISPONIBLE", label: "Disponibles", count: counts.DISPONIBLE, tone: "bg-emerald-500" },
        { key: "RESERVADA", label: "Reservados", count: counts.RESERVADA, tone: "bg-amber-500" },
        { key: "VENDIDA", label: "Vendidos", count: counts.VENDIDA, tone: "bg-rose-500" },
    ];
    if (counts.BLOQUEADA > 0)
        filterButtons.push({ key: "BLOQUEADA", label: "Bloqueados", count: counts.BLOQUEADA, tone: "bg-slate-400" });
    if (counts.SUSPENDIDO > 0)
        filterButtons.push({ key: "SUSPENDIDO", label: "Suspendidos", count: counts.SUSPENDIDO, tone: "bg-slate-500" });

    const selectLote = (unit: PublicUnitItem) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
            new CustomEvent("seventoop:select-lote", {
                detail: {
                    id: unit.id,
                    numero: unit.numero,
                    estado: unit.estado,
                    precio: unit.precio,
                    moneda: unit.moneda,
                    superficie: unit.superficie,
                },
            }),
        );
    };

    return (
        <div className="space-y-6">
            {!isCompact && (
                <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <SlidersHorizontal className="h-4 w-4 text-brand-500" />
                            <span className="font-bold uppercase tracking-[0.18em] text-foreground">
                                Filtros
                            </span>
                            <span className="text-xs">
                                · {filtered.length} de {units.length} unidades
                            </span>
                        </div>
                        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
                            <div className="relative w-full sm:w-64">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <label htmlFor="units-search" className="sr-only">
                                    Buscar lote por código
                                </label>
                                <input
                                    id="units-search"
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Buscar por código de lote..."
                                    aria-label="Buscar lote por código"
                                    className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortKey)}
                                aria-label="Ordenar"
                                className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="default">Recomendado</option>
                                <option value="numero_asc">Número de lote</option>
                                <option value="precio_asc">Precio: menor a mayor</option>
                                <option value="precio_desc">Precio: mayor a menor</option>
                                <option value="superficie_asc">Superficie: menor a mayor</option>
                                <option value="superficie_desc">Superficie: mayor a menor</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                        {filterButtons.map(({ key, label, count, tone }) => {
                            const active = estado === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setEstado(key)}
                                    className={`group inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                                        active
                                            ? "border-brand-500 bg-brand-500 text-white shadow"
                                            : "border-border bg-background text-muted-foreground hover:border-brand-500/40 hover:text-foreground"
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${tone}`} />
                                    {label}
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                                            active ? "bg-white/20 text-white" : "bg-muted text-foreground"
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {shown.length > 0 ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shown.map((unit) => {
                        const tone = ESTADO_TONE[unit.estado] ?? ESTADO_TONE.DISPONIBLE;
                        return (
                            <article
                                key={unit.id}
                                className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10"
                            >
                                {/* Top accent bar (state color) */}
                                <div className={`h-1.5 w-full ${tone.dot}`} aria-hidden="true" />

                                <div className="flex flex-1 flex-col gap-4 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                                <Hash className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{unit.etapaNombre || "Lote"}</span>
                                            </div>
                                            <p className="mt-1 truncate text-xl font-black tabular-nums text-foreground">
                                                {unit.numero}
                                            </p>
                                            {unit.manzanaNombre && (
                                                <p className="mt-1 truncate text-xs text-muted-foreground">
                                                    {/^manzana\s/i.test(unit.manzanaNombre)
                                                        ? unit.manzanaNombre
                                                        : `Manzana ${unit.manzanaNombre}`}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${tone.chip}`}
                                        >
                                            {tone.label}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-background/60 p-3">
                                        <div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <Maximize2 className="h-3 w-3" />
                                                Superficie
                                            </div>
                                            <p className="mt-1 text-sm font-extrabold text-foreground">
                                                {formatSurface(unit.superficie)}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                <Tag className="h-3 w-3" />
                                                Precio
                                            </div>
                                            <p className="mt-1 truncate text-sm font-extrabold text-foreground">
                                                {formatCurrency(unit.precio, unit.moneda)}
                                            </p>
                                        </div>
                                    </div>

                                    {(unit.orientacion || unit.esEsquina) && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <MapPin className="h-3 w-3 text-brand-500" />
                                            {[unit.orientacion, unit.esEsquina ? "Esquina" : null]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center gap-2 pt-1">
                                        <Link
                                            href={`/proyectos/${slug}/unidades/${unit.id}`}
                                            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-center text-xs font-bold text-foreground transition-colors hover:bg-muted"
                                        >
                                            Ver detalle
                                        </Link>
                                        <a
                                            href="#contacto"
                                            onClick={() => selectLote(unit)}
                                            className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-brand-400"
                                        >
                                            Consultar
                                        </a>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
                    <p className="font-bold text-foreground">No encontramos lotes con esos filtros.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Probá quitar la búsqueda o cambiar el estado para ver más resultados.
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-bold text-foreground">{shown.length}</span> de{" "}
                    <span className="font-bold text-foreground">{filtered.length}</span>{" "}
                    {filtered.length === 1 ? "unidad" : "unidades"}
                </p>
                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => v + pageSize)}
                        className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                    >
                        Ver más unidades
                    </button>
                )}
                {isCompact && seeAllHref && filtered.length > shown.length && (
                    <Link
                        href={seeAllHref}
                        className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-400"
                    >
                        Ver todas las unidades <ArrowRight className="h-4 w-4" />
                    </Link>
                )}
            </div>
        </div>
    );
}
