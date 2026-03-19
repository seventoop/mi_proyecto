"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
    Home, TrendingUp, Rocket, Star, BarChart3, ShieldCheck,
    Lock, ArrowUpRight, MapPin, Clock,
    AlertCircle, Wallet, BookmarkCheck
} from "lucide-react";
import InversorUpgradeModal from "@/components/portafolio/inversor-upgrade-modal";
import InvestorFinancialSummary from "@/components/dashboard/investor-financial-summary";
import InvestorMovementsTable from "@/components/dashboard/investor-movements-table";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

interface Props {
    user: { id: string; nombre: string; email: string; kycStatus: string; riskLevel: string; rol: string };
    role: string;
    misUnidades: any[];
    inversorData: any | null;
    oportunidades: any[];
    inversorKycStatus: string | null;
}

export default function PortafolioDashboardClient({ user, role, misUnidades, inversorData, oportunidades, inversorKycStatus }: Props) {
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeSucceeded, setUpgradeSucceeded] = useState(false);
    const isInversor = role === "INVERSOR" || role === "ADMIN" || role === "SUPERADMIN";

    const handleUpgradeSuccess = () => {
        setShowUpgradeModal(false);
        setUpgradeSucceeded(true);
    };

    const rawData = inversorData?.data ?? inversorData ?? {};
    const { inversiones = [], stats = {}, movimientos = [], nextMilestone = null, distribution = [] } = rawData;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.investorPortafolio} />
                </div>
                {isInversor && (
                    <Link
                        href="/dashboard/portafolio/wallet"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-brand-400 hover:border-brand-400/30 transition-all text-sm font-bold w-fit"
                    >
                        <Wallet className="w-4 h-4" />
                        Billetera
                    </Link>
                )}
            </div>

            {/* ─── SECCIÓN: MIS PROPIEDADES ─────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Home className="w-5 h-5 text-brand-500" />
                        Mis Propiedades
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">
                            {misUnidades.length}
                        </span>
                    </h2>
                    {misUnidades.length > 0 && (
                        <Link href="/dashboard/portafolio/propiedades" className="text-sm font-bold text-brand-500 hover:underline">
                            Ver todas →
                        </Link>
                    )}
                </div>

                {misUnidades.length === 0 ? (
                    <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-10 text-center border-dashed">
                        <Home className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Aún no tenés propiedades</h3>
                        <p className="text-slate-500 mb-4">Explorá los proyectos disponibles y comenzá a invertir.</p>
                        <Link href="/dashboard/portafolio/marketplace" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg transition-all text-sm">
                            Ver Proyectos
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {misUnidades.map((unidad: any) => {
                            const proyecto = unidad.manzana.etapa.proyecto;
                            return (
                                <Link
                                    key={unidad.id}
                                    href={`/dashboard/portafolio/propiedades/${unidad.id}`}
                                    className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5 group hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors ease-[cubic-bezier(0.16,1,0.3,1)] duration-300"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{proyecto.nombre}</h3>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" /> {proyecto.ubicacion}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-lg text-xs font-bold",
                                            unidad.estado === "VENDIDA" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                        )}>
                                            {unidad.estado}
                                        </span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Unidad</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{unidad.numero}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Superficie</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{unidad.superficie} m²</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Precio</span>
                                            <span className="font-bold text-brand-500">{formatCurrency(unidad.precio || 0)}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ─── SECCIÓN: INVERSIONES EN M² ──────────────────────────── */}
            {isInversor ? (
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-500" />
                            Mis Inversiones en m²
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500">
                                {inversiones.length}
                            </span>
                        </h2>
                        <Link href="/dashboard/portafolio/inversiones" className="text-sm font-bold text-brand-500 hover:underline">
                            Ver detalle →
                        </Link>
                    </div>
                    <InvestorFinancialSummary stats={stats} distribution={distribution} nextMilestone={nextMilestone} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <InvestorMovementsTable movimientos={movimientos} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-900 dark:text-white">Oportunidades</h3>
                            {oportunidades.slice(0, 3).map((p: any) => (
                                <Link key={p.id} href="/dashboard/portafolio/marketplace"
                                    className="block bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-4 hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors ease-[cubic-bezier(0.16,1,0.3,1)] duration-300">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.nombre}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{p.ubicacion}</p>
                                </Link>
                            ))}
                            {oportunidades.length === 0 && (
                                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6 text-center">
                                    <p className="text-sm text-slate-500">Sin oportunidades disponibles.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            ) : (
                /* ─── CTA: Upgrade to INVERSOR ─────────────────────────────── */
                <section>
                    {upgradeSucceeded || inversorKycStatus === "EN_REVISION" ? (
                        <div className="bg-[#0A0A0C] rounded-2xl p-8 border border-white/[0.06] flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 z-10">
                                <Clock className="w-8 h-8 text-amber-500" />
                            </div>
                            <div className="z-10">
                                <h3 className="text-xl font-bold text-white mb-1">Solicitud en revisión</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Tu solicitud de verificación como Inversor está siendo revisada. Recibirás una notificación en 24-48hs hábiles.
                                </p>
                            </div>
                            <span className="z-10 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-bold shrink-0">
                                PENDIENTE
                            </span>
                        </div>
                    ) : inversorKycStatus === "RECHAZADO" ? (
                        <div className="bg-[#0A0A0C] rounded-2xl p-8 border border-rose-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
                            <div className="relative z-10 flex items-start gap-4 mb-6">
                                <AlertCircle className="w-8 h-8 text-rose-500 shrink-0" />
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Solicitud rechazada</h3>
                                    <p className="text-slate-400 text-sm">Tu solicitud fue rechazada. Revisá las observaciones y volvé a enviar la documentación corregida.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="relative z-10 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
                            >
                                Volver a solicitar
                            </button>
                        </div>
                    ) : (
                        /* CTA principal */
                        <div className="relative overflow-hidden bg-[#0A0A0C] rounded-2xl p-8 border border-white/[0.06]">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-3xl rounded-full pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
                                <div className="shrink-0">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-brand-500/30">
                                        <Rocket className="w-10 h-10 text-white" />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold mb-3">
                                            <Star className="w-3 h-3" /> Acceso Exclusivo
                                        </div>
                                        <h3 className="text-2xl font-black text-white leading-tight">
                                            Invertí en m² de proyectos inmobiliarios
                                        </h3>
                                        <p className="text-slate-400 mt-2 leading-relaxed">
                                            Como Inversor, accedés a oportunidades de fondeo mayorista en etapa temprana, con ROI proyectado y capital protegido en Escrow.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { icon: TrendingUp, text: "ROI proyectado hasta 30%" },
                                            { icon: ShieldCheck, text: "Capital protegido en Escrow" },
                                            { icon: BarChart3, text: "Portafolio diversificado en m²" },
                                            { icon: BookmarkCheck, text: "Alertas de nuevas oportunidades" },
                                        ].map(({ icon: Icon, text }) => (
                                            <div key={text} className="flex items-center gap-2.5 text-sm text-slate-300">
                                                <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                                                    <Icon className="w-3.5 h-3.5 text-brand-500" />
                                                </div>
                                                {text}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-4 pt-2">
                                        <button
                                            onClick={() => setShowUpgradeModal(true)}
                                            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-sm transition-all shadow-xl shadow-brand-500/30 active:scale-95"
                                        >
                                            <Rocket className="w-4 h-4" />
                                            Quiero invertir
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Lock className="w-3.5 h-3.5" />
                                            Requiere verificación de identidad
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Locked preview cards */}
                            <div className="relative z-10 mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 opacity-40 pointer-events-none select-none">
                                {[
                                    { label: "M² Portafolio", value: "—" },
                                    { label: "Capital Escrow", value: "—" },
                                    { label: "ROI Promedio", value: "—" },
                                    { label: "Valor Cartera", value: "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                                        <Lock className="w-4 h-4 text-slate-500" />
                                        <p className="text-xs text-slate-500">{label}</p>
                                        <p className="text-lg font-bold text-slate-600">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {showUpgradeModal && (
                <InversorUpgradeModal
                    onClose={() => setShowUpgradeModal(false)}
                    onSuccess={handleUpgradeSuccess}
                />
            )}
        </div>
    );
}
