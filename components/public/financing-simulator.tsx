"use client";

import { useState, useEffect } from "react";
import { Calculator, DollarSign, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FinancingSimulatorProps {
    price: number;
    currency: string;
}

export default function FinancingSimulator({ price, currency }: FinancingSimulatorProps) {
    const [downPaymentPercent, setDownPaymentPercent] = useState(30);
    const [installments, setInstallments] = useState(24);

    // Derived values
    const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
    const financedAmount = price - downPaymentAmount;
    const installmentAmount = Math.round(financedAmount / installments);

    return (
        <div className="bg-black rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-brand-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Simulador de Financiación</h3>
                    <p className="text-sm text-slate-400">Personaliza tu plan de pagos</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Down Payment Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">Anticipo ({downPaymentPercent}%)</span>
                        <span className="text-brand-400 font-bold">{formatCurrency(downPaymentAmount, currency)}</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="80"
                        step="5"
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>10%</span>
                        <span>80%</span>
                    </div>
                </div>

                {/* Installments Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300 font-medium">Cuotas ({installments})</span>
                        <span className="text-slate-400">Plazo sugerido</span>
                    </div>
                    <input
                        type="range"
                        min="6"
                        max="60"
                        step="6"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>6 meses</span>
                        <span>60 meses</span>
                    </div>
                </div>

                {/* Result */}
                <div className="pt-6 border-t border-white/10">
                    <div className="bg-brand-500/10 rounded-xl p-4 border border-brand-500/20 text-center">
                        <p className="text-sm text-brand-300 mb-1">Valor estimado de cuota</p>
                        <p className="text-3xl font-bold text-white">
                            {formatCurrency(installmentAmount, currency)}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                            *Valores estimados sujetos a aprobación crediticia.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
