"use client";

import { useState } from "react";
import { ChevronDown, Home } from "lucide-react";
import PaymentSimulator from "./payment-simulator";
import type { ProjectPublicUnit, ProjectPaymentSimulationConfig } from "@/lib/project-landing/types";

interface LandingSimulatorSectionProps {
    proyectoId: string;
    proyectoNombre: string;
    unidades: ProjectPublicUnit[];
    config: ProjectPaymentSimulationConfig;
}

export default function LandingSimulatorSection({
    proyectoId,
    proyectoNombre,
    unidades,
    config,
}: LandingSimulatorSectionProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selected = unidades.find((u) => u.id === selectedId) ?? null;

    return (
        <div className="space-y-6">
            {unidades.length > 0 && (
                <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
                        Simular para un lote específico (opcional)
                    </label>
                    <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <select
                            value={selectedId ?? ""}
                            onChange={(e) => setSelectedId(e.target.value || null)}
                            className="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        >
                            <option value="">Sin lote específico — simulación general</option>
                            {unidades.map((u) => (
                                <option key={u.id} value={u.id} className="bg-slate-900">
                                    Lote #{u.numero}
                                    {u.superficie ? ` · ${u.superficie} m²` : ""}
                                    {u.precio ? ` · USD ${u.precio.toLocaleString("es-AR")}` : ""}
                                    {u.esEsquina ? " (esquina)" : ""}
                                    {u.manzanaNombre ? ` — Mz. ${u.manzanaNombre}` : ""}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {selected && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            {selected.superficie && <span className="bg-white/5 rounded-lg px-2 py-1">{selected.superficie} m²</span>}
                            {selected.frente && selected.fondo && (
                                <span className="bg-white/5 rounded-lg px-2 py-1">{selected.frente}m × {selected.fondo}m</span>
                            )}
                            {selected.orientacion && <span className="bg-white/5 rounded-lg px-2 py-1">{selected.orientacion}</span>}
                            {selected.esEsquina && <span className="bg-amber-500/10 text-amber-400 rounded-lg px-2 py-1">Esquina</span>}
                            {selected.etapaNombre && <span className="bg-white/5 rounded-lg px-2 py-1">Etapa: {selected.etapaNombre}</span>}
                        </div>
                    )}
                </div>
            )}

            <PaymentSimulator
                proyectoId={proyectoId}
                proyectoNombre={proyectoNombre}
                unidadId={selected?.id}
                unidadNumero={selected?.numero}
                precioReferencia={selected?.precio ?? undefined}
                config={config}
            />
        </div>
    );
}
