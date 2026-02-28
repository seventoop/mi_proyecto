"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { depositFunds } from "@/lib/actions/wallet";

export default function DepositModal({ onClose }: { onClose: () => void }) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await depositFunds({ monto: parseFloat(amount) });
        if (res.success) {
            onClose();
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-brand-orange/10 rounded-2xl text-brand-orange">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cargar Fondos</h3>
                        <p className="text-sm text-slate-500">Pasarela de pago segura (Simulada)</p>
                    </div>
                </div>

                <form onSubmit={handleDeposit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Monto a cargar (USD)</label>
                        <input
                            type="number"
                            required
                            min="10"
                            placeholder="Ej: 1000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-2xl font-black focus:ring-2 focus:ring-brand-orange outline-none"
                        />
                    </div>

                    <div className="p-4 bg-brand-orange/5 border border-brand-orange/10 rounded-2xl flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                        <p className="text-xs text-brand-orange dark:text-brand-orange leading-relaxed">
                            Tus fondos serán acreditados instantáneamente tras la verificación de la transacción.
                        </p>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 py-4 bg-brand-orange hover:bg-brand-orangeDark disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-brand-orange/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Pagar Ahora"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
