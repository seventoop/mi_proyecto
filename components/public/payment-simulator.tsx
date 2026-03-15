"use client";

/**
 * Payment Simulator — Project Landing System
 *
 * Commercial payment proposal simulator for project landing pages.
 * NOT a replacement for financing-simulator.tsx (which remains untouched).
 * This version captures intent and sends a structured proposal to the CRM.
 *
 * Design principles:
 * - Always shows legal disclaimer — never presents values as binding
 * - Two phases: (1) simulate, (2) send proposal
 * - Zero dependencies on internal auth or dashboard modules
 */

import { useState } from "react";
import { Calculator, Send, CheckCircle, AlertTriangle, ChevronDown, Phone, Mail, User, CalendarCheck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { crearSimulacionFinanciacion } from "@/lib/project-landing/actions";
import type { ProjectPaymentSimulationConfig } from "@/lib/project-landing/types";
import { DEFAULT_SIMULATION_CONFIG } from "@/lib/project-landing/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentSimulatorProps {
    proyectoId: string;
    proyectoNombre: string;
    /** Optional pre-selected unit */
    unidadId?: string;
    unidadNumero?: string;
    /** Reference price to show a percentage-based anticipo hint */
    precioReferencia?: number;
    config?: ProjectPaymentSimulationConfig;
    className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
    return n.toLocaleString("es-AR");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentSimulator({
    proyectoId,
    proyectoNombre,
    unidadId,
    unidadNumero,
    precioReferencia,
    config = DEFAULT_SIMULATION_CONFIG,
    className,
}: PaymentSimulatorProps) {
    // ── Simulation state ──
    const [anticipo, setAnticipo] = useState<string>("");
    const [cuota, setCuota] = useState<string>("");
    const [plazo, setPlazo] = useState<number>(config.plazoOptions[2] ?? 36);
    const [showProposal, setShowProposal] = useState(false);

    // ── Contact state ──
    const [nombre, setNombre] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [email, setEmail] = useState("");
    const [quiereVisita, setQuiereVisita] = useState(false);
    const [quiereWhatsApp, setQuiereWhatsApp] = useState(true);

    // ── Submission state ──
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Derived simulation values ──
    const anticipoNum = parseFloat(anticipo.replace(/\./g, "").replace(",", ".")) || 0;
    const cuotaNum = parseFloat(cuota.replace(/\./g, "").replace(",", ".")) || 0;
    const totalEstimado = anticipoNum + cuotaNum * plazo;
    const hasSimulation = anticipoNum > 0 || cuotaNum > 0;

    // ── Anticipo hint based on reference price ──
    const hintPct =
        precioReferencia && anticipoNum > 0
            ? Math.round((anticipoNum / precioReferencia) * 100)
            : null;

    const canSendProposal = nombre.trim().length >= 2 && whatsapp.trim().length >= 6 && hasSimulation;

    async function handleSend() {
        if (!canSendProposal) return;
        setSending(true);
        setError(null);

        const result = await crearSimulacionFinanciacion({
            proyectoId,
            proyectoNombre,
            unidadId,
            unidadNumero,
            nombre: nombre.trim(),
            whatsapp: whatsapp.trim(),
            email: email.trim() || undefined,
            anticipoDisponible: anticipoNum,
            cuotaMensualPosible: cuotaNum,
            plazoMeses: plazo,
            quiereVisita,
            quiereWhatsApp,
            origen: unidadId ? "SIMULADOR_UNIDAD" : "SIMULADOR_LANDING",
            moneda: config.currency,
        });

        setSending(false);

        if (result.success) {
            setSent(true);
        } else {
            setError(result.error ?? "No se pudo enviar la propuesta.");
        }
    }

    // ── Success screen ──
    if (sent) {
        return (
            <div className={cn("bg-slate-900 rounded-3xl border border-white/10 p-8 text-center", className)}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¡Propuesta enviada!</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
                    Un asesor va a revisar tu propuesta y te contactará a la brevedad.
                    {quiereWhatsApp && " Te escribimos por WhatsApp."}
                </p>
                <button
                    onClick={() => { setSent(false); setShowProposal(false); }}
                    className="text-xs text-slate-500 hover:text-slate-300 underline"
                >
                    Hacer otra consulta
                </button>
            </div>
        );
    }

    return (
        <div className={cn("bg-slate-900 rounded-3xl border border-white/10 overflow-hidden", className)}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                        <Calculator className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">Simulá tu propuesta</h3>
                        <p className="text-xs text-slate-500">
                            {unidadNumero ? `Unidad #${unidadNumero} · ` : ""}
                            {proyectoNombre}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* ── Anticipo ── */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Anticipo disponible
                        {hintPct !== null && (
                            <span className="ml-2 text-brand-400 normal-case font-normal">
                                (~{hintPct}% del precio)
                            </span>
                        )}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                            {config.currency}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={anticipo}
                            onChange={(e) => setAnticipo(e.target.value.replace(/[^0-9.,]/g, ""))}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-lg font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        />
                    </div>
                </div>

                {/* ── Cuota mensual ── */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Cuota mensual posible
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                            {config.currency}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={cuota}
                            onChange={(e) => setCuota(e.target.value.replace(/[^0-9.,]/g, ""))}
                            className="w-full bg-slate-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white text-lg font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        />
                    </div>
                </div>

                {/* ── Plazo ── */}
                <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                        Plazo deseado
                    </label>
                    <div className="relative">
                        <select
                            value={plazo}
                            onChange={(e) => setPlazo(Number(e.target.value))}
                            className="w-full appearance-none bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/40 pr-10"
                        >
                            {config.plazoOptions.map((p) => (
                                <option key={p} value={p}>
                                    {p} meses ({Math.round(p / 12)} {p <= 12 ? "año" : "años"})
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* ── Simulation summary ── */}
                {hasSimulation && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Resumen orientativo</p>
                        {anticipoNum > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Anticipo</span>
                                <span className="text-white font-bold">{config.currency} {formatNumber(anticipoNum)}</span>
                            </div>
                        )}
                        {cuotaNum > 0 && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Cuota × {plazo}</span>
                                    <span className="text-white font-bold">{config.currency} {formatNumber(cuotaNum)}/mes</span>
                                </div>
                                <div className="flex justify-between text-sm pt-1 border-t border-white/5">
                                    <span className="text-slate-400">Total estimado en cuotas</span>
                                    <span className="text-brand-400 font-bold">{config.currency} {formatNumber(totalEstimado)}</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Legal disclaimer (always visible) ── */}
                <div className="flex gap-2 text-xs text-slate-500 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 flex-shrink-0 mt-0.5" />
                    <span>{config.disclaimer}</span>
                </div>

                {/* ── CTA to show proposal form ── */}
                {!showProposal && (
                    <button
                        onClick={() => setShowProposal(true)}
                        disabled={!hasSimulation}
                        className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                            hasSimulation
                                ? "bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20"
                                : "bg-slate-800 text-slate-600 cursor-not-allowed"
                        )}
                    >
                        <Send className="w-4 h-4" />
                        Enviar propuesta a un asesor
                    </button>
                )}

                {/* ── Proposal / contact form ── */}
                {showProposal && (
                    <div className="space-y-4 border-t border-white/5 pt-5">
                        <p className="text-sm font-semibold text-white">Tus datos de contacto</p>

                        {/* Nombre */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Nombre y apellido *"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                            />
                        </div>

                        {/* WhatsApp */}
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="WhatsApp *"
                                value={whatsapp}
                                onChange={(e) => setWhatsapp(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                            />
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                placeholder="Email (opcional)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                            />
                        </div>

                        {/* Preferences */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <button
                                    role="checkbox"
                                    aria-checked={quiereVisita}
                                    onClick={() => setQuiereVisita((v) => !v)}
                                    className={cn(
                                        "w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                        quiereVisita
                                            ? "bg-brand-600 border-brand-600"
                                            : "border-white/20 bg-slate-800 group-hover:border-white/40"
                                    )}
                                >
                                    {quiereVisita && <CheckCircle className="w-3 h-3 text-white fill-white stroke-none" />}
                                </button>
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <CalendarCheck className="w-4 h-4 text-slate-500" />
                                    Quiero coordinar una visita
                                </span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group">
                                <button
                                    role="checkbox"
                                    aria-checked={quiereWhatsApp}
                                    onClick={() => setQuiereWhatsApp((v) => !v)}
                                    className={cn(
                                        "w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                        quiereWhatsApp
                                            ? "bg-brand-600 border-brand-600"
                                            : "border-white/20 bg-slate-800 group-hover:border-white/40"
                                    )}
                                >
                                    {quiereWhatsApp && <CheckCircle className="w-3 h-3 text-white fill-white stroke-none" />}
                                </button>
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <MessageCircle className="w-4 h-4 text-slate-500" />
                                    Prefiero que me contacten por WhatsApp
                                </span>
                            </label>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        {/* Submit */}
                        <button
                            onClick={handleSend}
                            disabled={!canSendProposal || sending}
                            className={cn(
                                "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                                canSendProposal && !sending
                                    ? "bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20"
                                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                            )}
                        >
                            {sending ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Enviar propuesta
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => setShowProposal(false)}
                            className="w-full text-xs text-slate-500 hover:text-slate-300 py-1"
                        >
                            Volver al simulador
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
