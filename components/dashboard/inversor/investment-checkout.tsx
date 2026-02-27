"use client";

import { useState } from "react";
import {
    ShieldCheck,
    FileText,
    ArrowRight,
    TrendingUp,
    Calculator,
    AlertCircle,
    CheckCircle2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InvestmentCheckoutProps {
    proyecto: {
        id: string;
        nombre: string;
        precioM2Inversor: number;
        precioM2Mercado: number;
    };
    onClose: () => void;
}

export default function InvestmentCheckout({ proyecto, onClose }: InvestmentCheckoutProps) {
    const [step, setStep] = useState(1);
    const [m2, setM2] = useState(10);
    const [isSignConfirmed, setIsSignConfirmed] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const totalCost = m2 * proyecto.precioM2Inversor;
    const targetValue = m2 * proyecto.precioM2Mercado;
    const projectedProfit = targetValue - totalCost;
    const roi = Math.round((projectedProfit / totalCost) * 100);

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleFinish = async () => {
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 2000));
        setIsProcessing(false);
        setIsSuccess(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            >
                <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10">
                    <X className="w-5 h-5 text-slate-400" />
                </button>

                {!isSuccess ? (
                    <div className="p-8 md:p-12">
                        {/* Steps indicator */}
                        <div className="flex gap-2 mb-8">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={cn(
                                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                                    step >= s ? "bg-brand-orange shadow-glow-sm" : "bg-slate-100 dark:bg-slate-800"
                                )} />
                            ))}
                        </div>

                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Selecciona tu Inversión</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">¿Cuántos metros cuadrados deseas adquirir en {proyecto.nombre}?</p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-8">
                                        <span className="text-4xl font-black text-brand-orange">{m2} m²</span>
                                        <div className="text-right">
                                            <div className="text-sm text-slate-400 uppercase font-bold tracking-widest">Costo Total</div>
                                            <div className="text-2xl font-black text-slate-900 dark:text-white">${totalCost.toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <input
                                        type="range" min="1" max="500" value={m2}
                                        onChange={(e) => setM2(parseInt(e.target.value))}
                                        className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400 mt-4 font-bold">
                                        <span>MíN: 1 m²</span>
                                        <span>MÁX: 500 m²</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-brand-yellow/5 border border-brand-yellow/20">
                                        <div className="flex items-center gap-2 text-brand-yellow font-bold mb-1">
                                            <TrendingUp className="w-4 h-4" />
                                            ROI Estimado
                                        </div>
                                        <div className="text-2xl font-black text-brand-yellow">+{roi}%</div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-brand-orange/5 border border-brand-orange/20">
                                        <div className="flex items-center gap-2 text-brand-orange font-bold mb-1">
                                            <Calculator className="w-4 h-4" />
                                            Ganancia Neta
                                        </div>
                                        <div className="text-2xl font-black text-brand-orange">+${projectedProfit.toLocaleString()}</div>
                                    </div>
                                </div>

                                <button onClick={handleNext} className="w-full py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                                    Siguiente paso
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Contrato Digital</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">Revisa y firma los términos de la inversión protegida en Escrow.</p>
                                </div>

                                <div className="h-64 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
                                    <p className="font-bold text-slate-900 dark:text-white mb-4">CONTRATO DE ADQUISICIÓN DE M2 - PROTECCIÓN ESCROW</p>
                                    <p className="mb-4">1. OBJETO: El inversor adquiere {m2} m² del proyecto {proyecto.nombre} a un valor mayorista de ${proyecto.precioM2Inversor}/m².</p>
                                    <p className="mb-4">2. ESCROW: Los fondos por un total de ${totalCost} serán retenidos por Seventoop hasta que el proyecto alcance el Soft Cap de fondeo.</p>
                                    <p className="mb-4">3. GARANTÍA: En caso de no alcanzarse la meta de fondeo antes del plazo estipulado, el 100% de los capitales serán devueltos a la billetera del inversor.</p>
                                    <p className="mb-4">4. CESIÓN: El inversor podrá ceder sus derechos sobre estos m2 a terceros una vez que el proyecto sea lanzado al mercado abierto.</p>
                                    <p>Al firmar este documento, acepto los riesgos inherentes a la inversión inmobiliaria y las condiciones de protección de la plataforma.</p>
                                </div>

                                <label className="flex items-center gap-4 p-6 rounded-2xl border-2 border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <input
                                        type="checkbox" checked={isSignConfirmed}
                                        onChange={(e) => setIsSignConfirmed(e.target.checked)}
                                        className="w-6 h-6 rounded-lg accent-brand-orange"
                                    />
                                    <div className="text-sm font-bold text-slate-900 dark:text-white text-left">
                                        Confirmo mi firma electrónica y acepto los términos del contrato digital.
                                    </div>
                                </label>

                                <div className="flex gap-4">
                                    <button onClick={handleBack} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition-colors">
                                        Regresar
                                    </button>
                                    <button
                                        disabled={!isSignConfirmed}
                                        onClick={handleNext}
                                        className="flex-[2] py-5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black disabled:opacity-50 hover:scale-[1.02] transition-transform"
                                    >
                                        Confirmar firma
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-brand-orange/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <ShieldCheck className="w-10 h-10 text-brand-orange" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white">Verificación Final</h2>
                                    <p className="text-slate-500 dark:text-slate-400 mt-2">Tu inversión está lista para ser procesada en el sistema Escrow.</p>
                                </div>

                                <div className="bg-slate-900 text-white p-8 rounded-[2rem] space-y-4">
                                    <div className="flex justify-between pb-4 border-b border-white/10">
                                        <span className="text-slate-400">Concepto</span>
                                        <span className="font-bold">Adquisición m2 {proyecto.nombre}</span>
                                    </div>
                                    <div className="flex justify-between pb-4 border-b border-white/10">
                                        <span className="text-slate-400">Cantidad</span>
                                        <span className="font-bold">{m2} m²</span>
                                    </div>
                                    <div className="flex justify-between pt-2">
                                        <span className="text-slate-400 text-lg">Total a transferir</span>
                                        <span className="text-3xl font-black text-brand-yellow">${totalCost.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={handleBack} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-slate-600 dark:text-slate-400">
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleFinish}
                                        className="flex-[2] py-5 bg-brand-orange text-white rounded-2xl font-black shadow-lg shadow-brand-orange/30 flex items-center justify-center gap-2 hover:bg-brand-orangeDark transition-all"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>Realizar Inversión Escrow</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* SUCCESS STATE */
                    <div
                        className="p-12 text-center flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        <div className="w-24 h-24 bg-brand-orange rounded-full flex items-center justify-center shadow-glow-lg">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white">¡Inversión Protegida!</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-3 text-lg">
                                Se han procesado tus <strong>{m2} m²</strong> correctamente. Los fondos ahora están custodiados en Escrow bajo el ID: <strong>GTX-{Math.random().toString(36).substr(2, 9).toUpperCase()}</strong>.
                            </p>
                        </div>

                        <button onClick={onClose} className="w-full py-5 bg-brand-orange text-white rounded-2xl font-black shadow-lg hover:bg-brand-orangeDark transition-colors">
                            Ir a mi Portafolio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
