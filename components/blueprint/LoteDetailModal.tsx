"use client";

import { X, Home, Ruler, DollarSign, Lock, Calendar, Map, Eye } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface LoteInfo {
    id: string;
    numero: string;
    tipo?: string;
    superficie?: number | null;
    frente?: number | null;
    fondo?: number | null;
    orientacion?: string | null;
    esEsquina?: boolean;
    precio?: number | null;
    moneda?: string;
    estado: string;
    bloqueadoHasta?: Date | string | null;
}

interface LoteDetailModalProps {
    unidad: LoteInfo;
    onClose: () => void;
    onReservar?: () => void;
    proyectoSlug?: string;
    tour360Url?: string;
}

const ESTADO_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    DISPONIBLE:        { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Disponible" },
    RESERVADO:         { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Reservado" },
    RESERVADA:         { bg: "bg-amber-500/10",   text: "text-amber-400",   label: "Reservado" },
    RESERVADA_PENDIENTE:{ bg: "bg-amber-500/10",  text: "text-amber-400",   label: "Reservado" },
    VENDIDO:           { bg: "bg-rose-500/10",    text: "text-rose-400",    label: "Vendido" },
    VENDIDA:           { bg: "bg-rose-500/10",    text: "text-rose-400",    label: "Vendido" },
    BLOQUEADO:         { bg: "bg-slate-500/10",   text: "text-slate-400",   label: "Bloqueado" },
};

export default function LoteDetailModal({ unidad, onClose, onReservar, proyectoSlug, tour360Url }: LoteDetailModalProps) {
    const estado = ESTADO_STYLES[unidad.estado] ?? ESTADO_STYLES.DISPONIBLE;
    const bloqueadoHasta = unidad.bloqueadoHasta ? new Date(unidad.bloqueadoHasta as string) : null;
    const isDisponible = unidad.estado === "DISPONIBLE";
    const isReservado = ["RESERVADO", "RESERVADA", "RESERVADA_PENDIENTE"].includes(unidad.estado);
    const isVendido = ["VENDIDO", "VENDIDA"].includes(unidad.estado);
    const isBloqueado = unidad.estado === "BLOQUEADO";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                            <Home className="w-5 h-5 text-brand-orange" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                                Lote #{unidad.numero}
                            </h2>
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", estado.bg, estado.text)}>
                                {estado.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {unidad.superficie && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                    <Ruler className="w-3 h-3" /> Superficie
                                </div>
                                <p className="font-bold text-slate-800 dark:text-white">{unidad.superficie} m²</p>
                            </div>
                        )}
                        {(unidad.frente || unidad.fondo) && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                    <Ruler className="w-3 h-3" /> Frente × Fondo
                                </div>
                                <p className="font-bold text-slate-800 dark:text-white">
                                    {unidad.frente ?? "—"}m × {unidad.fondo ?? "—"}m
                                </p>
                            </div>
                        )}
                        {unidad.orientacion && (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <p className="text-xs text-slate-500 mb-1">Orientación</p>
                                <p className="font-bold text-slate-800 dark:text-white">{unidad.orientacion}</p>
                            </div>
                        )}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <p className="text-xs text-slate-500 mb-1">Es esquina</p>
                            <p className="font-bold text-slate-800 dark:text-white">{unidad.esEsquina ? "Sí" : "No"}</p>
                        </div>
                    </div>

                    {/* Precio */}
                    {unidad.precio && (
                        <div className="p-4 bg-brand-orange/5 border border-brand-orange/20 rounded-xl flex items-center gap-3">
                            <DollarSign className="w-6 h-6 text-brand-orange shrink-0" />
                            <div>
                                <p className="text-xs text-slate-500">Precio</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">
                                    {formatCurrency(unidad.precio)} {unidad.moneda || "USD"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Estado especial */}
                    {isBloqueado && bloqueadoHasta && (
                        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                            <p className="text-sm text-rose-400 font-medium">
                                Bloqueado hasta {bloqueadoHasta.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="space-y-2 pt-1">
                        {isDisponible && onReservar && (
                            <button
                                onClick={onReservar}
                                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <Calendar className="w-4 h-4" />
                                Iniciar Reserva
                            </button>
                        )}
                        {isReservado && (
                            <button className="w-full py-3 rounded-xl border border-amber-500 text-amber-500 font-bold hover:bg-amber-500/10 transition-colors">
                                Ver Reserva
                            </button>
                        )}
                        {isVendido && (
                            <button disabled className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold cursor-not-allowed">
                                Ver Escritura
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer links */}
                <div className="flex gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
                    {proyectoSlug && (
                        <a
                            href={`?tab=masterplan`}
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg text-xs font-bold text-center text-slate-500 hover:text-brand-orange hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                        >
                            <Map className="w-3 h-3" /> Ver en Masterplan
                        </a>
                    )}
                    {tour360Url && (
                        <a
                            href={`?tab=tour360`}
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg text-xs font-bold text-center text-slate-500 hover:text-brand-orange hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                        >
                            <Eye className="w-3 h-3" /> Ver en Tour 360°
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
