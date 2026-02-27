"use client";

import { useState } from "react";
import { DollarSign, PieChart, TrendingUp, ShieldCheck, Clock, CheckCircle, AlertCircle, Plus, Play } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { crearInversion } from "@/lib/actions/inversiones";
import { crearHito, completarHito, liberarFondosHito } from "@/lib/actions/escrow";
import { useRouter } from "next/navigation";

interface InversionPanelProps {
    proyectoId: string;
    proyectoNombre: string;
    invertible: boolean;
    m2Vendidos: number;
    metaM2: number;
    precioM2: number;
    fechaLimite?: Date;
    hitos: any[];
    inversiones: any[];
    userRole: string;
}

export default function InversionPanel({
    proyectoId,
    proyectoNombre,
    invertible,
    m2Vendidos,
    metaM2,
    precioM2,
    fechaLimite,
    hitos,
    inversiones,
    userRole
}: InversionPanelProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState<number>(10); // m2 a comprar
    const [showInvestModal, setShowInvestModal] = useState(false);
    const [showHitoModal, setShowHitoModal] = useState(false);

    // Calcular progreso
    const progress = Math.min(Math.round((m2Vendidos / metaM2) * 100), 100);
    const timeLeft = fechaLimite ? Math.ceil((new Date(fechaLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Estado form hito
    const [hitoForm, setHitoForm] = useState({ titulo: "", porcentaje: "" });

    const handleInvest = async () => {
        if (!confirm(`¿Confirmar inversión por ${amount} m² ($${formatCurrency(amount * precioM2)})?`)) return;

        setLoading(true);
        try {
            const result = await crearInversion({
                proyectoId,
                m2Comprados: amount,
                montoTotal: amount * precioM2,
                metodoPago: "TRANSFERENCIA" // Simplificado por ahora
            });

            if (result.success) {
                alert("Inversión registrada correctamente. Pendiente de verificación.");
                setShowInvestModal(false);
                router.refresh();
            } else {
                alert(result.error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateHito = async () => {
        setLoading(true);
        try {
            const result = await crearHito({
                proyectoId,
                titulo: hitoForm.titulo,
                porcentajeLiberacion: parseFloat(hitoForm.porcentaje),
            });

            if (result.success) {
                setShowHitoModal(false);
                setHitoForm({ titulo: "", porcentaje: "" });
                router.refresh();
            } else {
                alert(result.error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRelease = async (id: string) => {
        if (!confirm("¿Liberar los fondos de este hito? Acción irreversible.")) return;
        setLoading(true);
        try {
            await liberarFondosHito(id);
            router.refresh();
        } finally {
            setLoading(false);
        }
    };

    if (!invertible) {
        return (
            <div className="glass-card p-8 text-center">
                <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-white">Inversión no habilitada</h3>
                <p className="text-slate-500">Este proyecto no está configurado para recibir inversiones del público.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Resumen de Fondeo */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-brand-orange" />
                            Estado del Fondeo
                        </h2>
                        <p className="text-sm text-slate-500">
                            Meta: {metaM2} m² • Cierre: {fechaLimite ? new Date(fechaLimite).toLocaleDateString() : "No definido"}
                        </p>
                    </div>
                    {userRole !== "ADMIN" && userRole !== "DESARROLLADOR" && (
                        <button
                            onClick={() => setShowInvestModal(true)}
                            className="px-6 py-2.5 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg transition-all animate-pulse-slow"
                        >
                            Invertir Ahora
                        </button>
                    )}
                </div>

                <div className="mb-2 flex justify-between text-sm font-semibold">
                    <span className="text-brand-orange">{m2Vendidos} m² V</span>
                    <span className="text-slate-400">{progress}% Completado</span>
                    <span className="text-slate-500">{metaM2} m² Meta</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-brand-orange to-brand-orangeDark transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Precio m² Inversor</p>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCurrency(precioM2)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Monto Recaudado</p>
                        <p className="text-lg font-bold text-brand-orange">{formatCurrency(m2Vendidos * precioM2)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Inversores</p>
                        <p className="text-lg font-bold text-brand-black dark:text-white">{new Set(inversiones.map(i => i.inversorId)).size}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <p className="text-xs text-slate-500 mb-1">Días Restantes</p>
                        <p className="text-lg font-bold text-brand-yellow">{timeLeft > 0 ? timeLeft : "Finalizado"}</p>
                    </div>
                </div>
            </div>

            {/* Escrow & Hitos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-brand-orange" />
                            Hitos de Liberación (Escrow)
                        </h3>
                        {(userRole === "ADMIN" || userRole === "DESARROLLADOR") && (
                            <button
                                onClick={() => setShowHitoModal(true)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 transaction-colors"
                            >
                                + Nuevo Hito
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {hitos.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-8">No hay hitos definidos aún.</p>
                        ) : (
                            hitos.map((hito) => (
                                <div key={hito.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={cn("w-2 h-2 rounded-full mt-2",
                                            hito.estado === "LIBERADO" ? "bg-brand-orange" :
                                                hito.estado === "COMPLETADO" ? "bg-brand-yellow" : "bg-slate-300"
                                        )} />
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white">{hito.titulo}</h4>
                                            <p className="text-sm text-slate-500">{hito.descripcion || "Sin descripción"}</p>
                                            <div className="mt-1 flex gap-2">
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                                                    Libera: {hito.porcentajeLiberacion}%
                                                </span>
                                                <span className={cn("text-xs font-bold px-2 py-0.5 rounded uppercase",
                                                    hito.estado === "LIBERADO" ? "text-brand-orange bg-brand-orange/10" :
                                                        hito.estado === "COMPLETADO" ? "text-brand-yellow bg-brand-yellow/10" : "text-brand-gray bg-brand-gray/10"
                                                )}>
                                                    {hito.estado}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {(userRole === "ADMIN") && hito.estado === "COMPLETADO" && (
                                        <button
                                            onClick={() => handleRelease(hito.id)}
                                            disabled={loading}
                                            className="px-3 py-1.5 bg-brand-orange text-white rounded-lg text-xs font-bold shadow-md hover:bg-brand-orangeDark transition-all"
                                        >
                                            Liberar Fondos
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Últimas Inversiones */}
                <div className="glass-card p-6">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-brand-orange" />
                        Actividad Reciente
                    </h3>
                    <div className="space-y-4">
                        {inversiones.slice(0, 5).map((inv) => (
                            <div key={inv.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium text-slate-700 dark:text-white">{inv.inversor.nombre || "Usuario"}</p>
                                    <p className="text-xs text-slate-400">{new Date(inv.fechaInversion).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-brand-orange">+{inv.m2Comprados} m²</p>
                                    <p className="text-xs text-slate-500">{formatCurrency(inv.montoTotal)}</p>
                                </div>
                            </div>
                        ))}
                        {inversiones.length === 0 && <p className="text-slate-400 text-sm text-center">Aún no hay inversiones.</p>}
                    </div>
                </div>
            </div>

            {/* Modal Invertir */}
            {showInvestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 p-6 animate-slide-up">
                        <h3 className="text-xl font-bold mb-4">Nueva Inversión</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-1">Cantidad de m²</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    min={1}
                                    className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm text-slate-500">Precio unitario:</span>
                                    <span className="font-medium">{formatCurrency(precioM2)}</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                                    <span className="font-bold">Total a pagar:</span>
                                    <span className="font-bold text-brand-orange text-lg">{formatCurrency(amount * precioM2)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setShowInvestModal(false)} className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-black uppercase tracking-widest text-xs transition-all">Cancelar</button>
                                <button onClick={handleInvest} disabled={loading} className="flex-1 py-2 bg-brand-orange text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-orange/20 hover:bg-brand-orangeDark transition-all">CONFIRMAR</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Nuevo Hito */}
            {showHitoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 p-6 animate-slide-up">
                        <h3 className="text-xl font-bold mb-4">Definir Hito Escrow</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Título del hito"
                                className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                value={hitoForm.titulo}
                                onChange={e => setHitoForm({ ...hitoForm, titulo: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="% Liberación (0-100)"
                                className="w-full p-2 border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                value={hitoForm.porcentaje}
                                onChange={e => setHitoForm({ ...hitoForm, porcentaje: e.target.value })}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowHitoModal(false)} className="flex-1 py-2 bg-brand-gray/10 text-brand-gray rounded-xl font-black uppercase tracking-widest text-xs transition-all">Cancelar</button>
                                <button onClick={handleCreateHito} disabled={loading} className="flex-1 py-2 bg-brand-orange text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-orange/20 hover:bg-brand-orangeDark transition-all">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
