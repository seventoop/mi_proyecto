"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { formatCurrency } from "@/lib/i18n/format";

interface FinancingSimulatorProps {
    price: number;
    currency: string;
}

export default function FinancingSimulator({ price, currency }: FinancingSimulatorProps) {
    const { locale, dictionary: t } = useLanguage();
    const copy = t.financingSimulator;
    const [downPaymentPercent, setDownPaymentPercent] = useState(30);
    const [installments, setInstallments] = useState(24);

    // Derived values
    const downPaymentAmount = Math.round(price * (downPaymentPercent / 100));
    const financedAmount = price - downPaymentAmount;
    const installmentAmount = Math.round(financedAmount / installments);

    return (
        <div className="bg-card rounded-2xl p-6 border border-border shadow-xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-brand-orange" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-foreground">{copy.title}</h3>
                    <p className="text-sm text-muted-foreground">{copy.description}</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Down Payment Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground/80 font-medium">{copy.downPayment} ({downPaymentPercent}%)</span>
                        <span className="text-brand-orange font-bold">{formatCurrency(downPaymentAmount, locale, currency)}</span>
                    </div>
                    <input
                        type="range"
                        min="10"
                        max="80"
                        step="5"
                        value={downPaymentPercent}
                        onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10%</span>
                        <span>80%</span>
                    </div>
                </div>

                {/* Installments Slider */}
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-foreground/80 font-medium">{copy.installments} ({installments})</span>
                        <span className="text-muted-foreground">{copy.suggestedTerm}</span>
                    </div>
                    <input
                        type="range"
                        min="6"
                        max="60"
                        step="6"
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>6 {copy.months}</span>
                        <span>60 {copy.months}</span>
                    </div>
                </div>

                {/* Result */}
                <div className="pt-6 border-t border-border">
                    <div className="bg-brand-orange/5 dark:bg-brand-orange/10 rounded-xl p-4 border border-brand-orange/20 text-center">
                        <p className="text-sm text-brand-orange/80 dark:text-brand-orange mb-1">{copy.estimatedInstallment}</p>
                        <p className="text-3xl font-black text-foreground">
                            {formatCurrency(installmentAmount, locale, currency)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            {copy.disclaimer}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
