"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

type EstadoFilter = "TODOS" | "DISPONIBLE" | "RESERVADA" | "VENDIDA";
type SortKey = "default" | "precio_asc" | "precio_desc" | "superficie_asc" | "superficie_desc";

interface Props {
    units: PublicUnitItem[];
    slug: string;
    mode?: "compact" | "full";
    pageSize?: number;
    seeAllHref?: string;
}

function formatCurrency(value: number | null, currency = "USD") {
    if (value == null || !Number.isFinite(value)) return "Consultar";
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
    }).format(value);
}

function getStateTone(estado: string) {
    switch (estado) {
        case "DISPONIBLE":
            return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
        case "RESERVADA":
            return "bg-amber-500/10 text-amber-600 border-amber-500/20";
        case "VENDIDA":
            return "bg-rose-500/10 text-rose-600 border-rose-500/20";
        default:
            return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
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
    const [visible, setVisible] = useState(pageSize);

    const filtered = useMemo(() => {
        let list = [...units];
        if (estado !== "TODOS") {
            list = list.filter((u) => u.estado === estado);
        }
        switch (sort) {
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
                    return a.numero.localeCompare(b.numero, "es", { numeric: true });
                });
        }
        return list;
    }, [units, estado, sort]);

    const shown = isCompact ? filtered.slice(0, pageSize) : filtered.slice(0, visible);
    const hasMore = !isCompact && visible < filtered.length;

    return (
        <div className="space-y-6">
            {!isCompact && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {([
                            ["TODOS", "Todos"],
                            ["DISPONIBLE", "Disponibles"],
                            ["RESERVADA", "Reservados"],
                            ["VENDIDA", "Vendidos"],
                        ] as Array<[EstadoFilter, string]>).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    setEstado(key);
                                    setVisible(pageSize);
                                }}
                                className={`rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                                    estado === key
                                        ? "bg-brand-500 text-white"
                                        : "bg-background text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Ordenar
                        </label>
                        <select
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value as SortKey);
                                setVisible(pageSize);
                            }}
                            className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground"
                        >
                            <option value="default">Recomendado</option>
                            <option value="precio_asc">Precio: menor a mayor</option>
                            <option value="precio_desc">Precio: mayor a menor</option>
                            <option value="superficie_asc">Superficie: menor a mayor</option>
                            <option value="superficie_desc">Superficie: mayor a menor</option>
                        </select>
                    </div>
                </div>
            )}

            {shown.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {shown.map((unit) => (
                        <Link
                            key={unit.id}
                            href={`/proyectos/${slug}/unidades/${unit.id}`}
                            className="group flex flex-col justify-between gap-3 rounded-2xl border border-border bg-background p-5 transition-all hover:border-brand-500/30 hover:bg-brand-500/5"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-foreground">Lote {unit.numero}</p>
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {[unit.etapaNombre, unit.manzanaNombre]
                                            .filter(Boolean)
                                            .join(" · ") || "Inventario público"}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${getStateTone(unit.estado)}`}>
                                    {unit.estado.replace(/_/g, " ")}
                                </span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">
                                    Superficie:{" "}
                                    <span className="font-semibold text-foreground">
                                        {unit.superficie ? `${unit.superficie} m²` : "Consultar"}
                                    </span>
                                </p>
                                <p className="text-muted-foreground">
                                    Precio:{" "}
                                    <span className="font-semibold text-foreground">
                                        {formatCurrency(unit.precio, unit.moneda)}
                                    </span>
                                </p>
                                {(unit.orientacion || unit.esEsquina) && (
                                    <p className="text-xs text-muted-foreground">
                                        {[unit.orientacion, unit.esEsquina ? "Esquina" : null]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-1 text-xs font-bold text-brand-500 transition-colors group-hover:text-brand-400">
                                Consultar lote <ArrowRight className="h-3 w-3" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    No hay lotes que coincidan con el filtro seleccionado.
                </div>
            )}

            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    Mostrando {shown.length} de {filtered.length} unidades
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
