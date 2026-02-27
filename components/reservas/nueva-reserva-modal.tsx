"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, Clock, DollarSign, MessageSquare, User, Building2,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLeadsAutocomplete, getVendedoresAutocomplete, getUnidadesDisponiblesAutocomplete } from "@/lib/actions/autocomplete";
import { toast } from "sonner";

interface NuevaReservaModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedUnitId?: string | null;
}

const plazos = [
    { value: "24", label: "24 horas" },
    { value: "48", label: "48 horas" },
    { value: "72", label: "72 horas" },
    { value: "custom", label: "Personalizado" },
];

export default function NuevaReservaModal({ isOpen, onClose, preselectedUnitId }: NuevaReservaModalProps) {
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [leadSearch, setLeadSearch] = useState("");
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [showLeadResults, setShowLeadResults] = useState(false);
    const [selectedVendedor, setSelectedVendedor] = useState<any>(null);
    const [plazo, setPlazo] = useState("48");
    const [customHoras, setCustomHoras] = useState("");
    const [montoSena, setMontoSena] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [showUnitSelect, setShowUnitSelect] = useState(!preselectedUnitId);
    const [submitting, setSubmitting] = useState(false);

    const [leads, setLeads] = useState<any[]>([]);
    const [vendedores, setVendedores] = useState<any[]>([]);
    const [unidades, setUnidades] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchVendedores();
            if (!preselectedUnitId) fetchUnidades();
        }
    }, [isOpen, preselectedUnitId]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (leadSearch.length >= 2) fetchLeads(leadSearch);
        }, 500);
        return () => clearTimeout(timeout);
    }, [leadSearch]);

    const fetchLeads = async (search: string) => {
        const res = await getLeadsAutocomplete(search);
        if (res.success) setLeads(res.data);
    };

    const fetchVendedores = async () => {
        const res = await getVendedoresAutocomplete();
        if (res.success) {
            setVendedores(res.data);
            if (res.data.length > 0) setSelectedVendedor(res.data[0]);
        }
    };

    const fetchUnidades = async () => {
        const res = await getUnidadesDisponiblesAutocomplete();
        if (res.success) setUnidades(res.data);
    };

    const handleSubmit = async () => {
        if (!selectedUnit || !selectedLead || !selectedVendedor) {
            toast.error("Por favor completa los campos obligatorios");
            return;
        }
        setSubmitting(true);

        try {
            const response = await fetch("/api/reservas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    unidadId: selectedUnit.id,
                    leadId: selectedLead.id,
                    vendedorId: selectedVendedor.id,
                    plazo: plazo === "custom" ? `${customHoras}` : `${plazo}hs`,
                    montoSena: montoSena ? parseFloat(montoSena) : null,
                    observaciones: observaciones || null,
                }),
            });

            if (response.ok) {
                toast.success("Reserva creada exitosamente");
                onClose();
            } else {
                const err = await response.json();
                toast.error(err.error || "Error al crear la reserva");
            }
        } catch {
            toast.error("Error de conexión");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                Nueva Reserva
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* ─── Unit Info ─── */}
                            {selectedUnit ? (
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-brand-500" />
                                            Unidad seleccionada
                                        </h3>
                                        {!preselectedUnitId && (
                                            <button
                                                onClick={() => { setSelectedUnit(null); setShowUnitSelect(true); }}
                                                className="text-xs text-brand-500 hover:underline font-medium"
                                            >
                                                Cambiar
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-slate-500 dark:text-slate-400 text-xs">Unidad</span>
                                            <p className="font-semibold text-slate-700 dark:text-white">{selectedUnit.numero}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 dark:text-slate-400 text-xs">Proyecto</span>
                                            <p className="font-semibold text-slate-700 dark:text-white">{selectedUnit.proyecto}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 dark:text-slate-400 text-xs">Superficie</span>
                                            <p className="font-medium text-slate-600 dark:text-slate-300">{selectedUnit.superficie} m²</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 dark:text-slate-400 text-xs">Precio</span>
                                            <p className="font-semibold text-emerald-500">${selectedUnit.precio?.toLocaleString()} {selectedUnit.moneda}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : showUnitSelect && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                        Seleccionar unidad disponible
                                    </label>
                                    <div className="space-y-2">
                                        {unidades.map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => { setSelectedUnit(u); setShowUnitSelect(false); }}
                                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left"
                                            >
                                                <div>
                                                    <span className="font-semibold text-sm text-slate-700 dark:text-white">{u.numero}</span>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.proyecto} · {u.superficie} m²</p>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-500">${u.precio?.toLocaleString()}</span>
                                            </button>
                                        ))}
                                        {unidades.length === 0 && (
                                            <p className="text-center py-4 text-slate-500 text-sm">No hay unidades disponibles.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ─── Lead Search ─── */}
                            <div className="relative">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    <User className="w-4 h-4 inline mr-1.5" />
                                    Buscar o seleccionar cliente
                                </label>
                                {selectedLead ? (
                                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <p className="font-semibold text-sm text-slate-700 dark:text-white">{selectedLead.nombre}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedLead.email} · {selectedLead.telefono}</p>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedLead(null); setLeadSearch(""); }}
                                            className="text-xs text-brand-500 hover:underline font-medium"
                                        >
                                            Cambiar
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                                            <input
                                                type="text"
                                                value={leadSearch}
                                                onChange={(e) => { setLeadSearch(e.target.value); setShowLeadResults(true); }}
                                                onFocus={() => setShowLeadResults(true)}
                                                placeholder="Buscar por nombre o email..."
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                                            />
                                        </div>
                                        {showLeadResults && (
                                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                                                {leads.map((lead) => (
                                                    <button
                                                        key={lead.id}
                                                        onClick={() => { setSelectedLead(lead); setShowLeadResults(false); }}
                                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                                    >
                                                        <p className="text-sm font-medium text-slate-700 dark:text-white">{lead.nombre}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{lead.email}</p>
                                                    </button>
                                                ))}
                                                {leads.length === 0 && leadSearch.length >= 2 && (
                                                    <p className="px-4 py-3 text-sm text-slate-400">No se encontraron resultados</p>
                                                )}
                                                {leadSearch.length < 2 && (
                                                    <p className="px-4 py-3 text-xs text-slate-400 italic text-center">Escribe al menos 2 caracteres...</p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* ─── Vendedor ─── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    Vendedor responsable
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedVendedor?.id || ""}
                                        onChange={(e) => {
                                            const v = vendedores.find((v) => v.id === e.target.value);
                                            if (v) setSelectedVendedor(v);
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 appearance-none"
                                    >
                                        <option value="" disabled>Seleccionar vendedor...</option>
                                        {vendedores.map((v) => (
                                            <option key={v.id} value={v.id}>{v.nombre}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* ─── Plazo ─── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1.5" />
                                    Plazo de reserva
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {plazos.map((p) => (
                                        <button
                                            key={p.value}
                                            onClick={() => setPlazo(p.value)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                                                plazo === p.value
                                                    ? "border-brand-500 bg-brand-500/10 text-brand-500"
                                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-500/50"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                {plazo === "custom" && (
                                    <div className="mt-3">
                                        <input
                                            type="number"
                                            value={customHoras}
                                            onChange={(e) => setCustomHoras(e.target.value)}
                                            placeholder="Cantidad de horas"
                                            min={1}
                                            className="w-40 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                        />
                                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">horas</span>
                                    </div>
                                )}
                            </div>

                            {/* ─── Seña ─── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    <DollarSign className="w-4 h-4 inline mr-1.5" />
                                    Monto de seña (opcional)
                                </label>
                                <div className="relative w-48">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 dark:text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={montoSena}
                                        onChange={(e) => setMontoSena(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                    />
                                </div>
                            </div>

                            {/* ─── Observaciones ─── */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    <MessageSquare className="w-4 h-4 inline mr-1.5" />
                                    Observaciones
                                </label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    rows={3}
                                    placeholder="Notas adicionales sobre la reserva..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-b-2xl">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedUnit || !selectedLead || submitting}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-glow transition-all",
                                    !selectedUnit || !selectedLead || submitting
                                        ? "bg-slate-400 cursor-not-allowed shadow-none"
                                        : "gradient-brand hover:shadow-glow-lg"
                                )}
                            >
                                {submitting ? "Creando..." : "Confirmar Reserva"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

