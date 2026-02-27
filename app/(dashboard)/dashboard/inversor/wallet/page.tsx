"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getWalletData } from "@/lib/actions/wallet";
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, History, Loader2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import DepositModal from "@/components/dashboard/inversor/deposit-modal";

export default function WalletPage() {
    const { data: session } = useSession();
    const [data, setData] = useState<{ saldo: number, transacciones: any[] }>({ saldo: 0, transacciones: [] });
    const [loading, setLoading] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);

    const loadData = async () => {
        if (!session?.user?.id) return;
        setLoading(true);
        const res = await getWalletData(session.user.id);
        if (res.success) {
            setData({ saldo: res.saldo || 0, transacciones: res.transacciones || [] });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [session?.user?.id]);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Billetera Virtual</h1>
                    <p className="text-slate-500 mt-1 text-sm">Gestiona tus fondos para inversiones inmobiliarias.</p>
                </div>
                <button
                    onClick={() => setShowDeposit(true)}
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-brand-600/20 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Cargar Saldo
                </button>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-slate-900 to-black p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Saldo Disponible</p>
                        <h2 className="text-5xl md:text-6xl font-black text-white flex items-center gap-2">
                            <span className="text-brand-500">$</span>{data.saldo.toLocaleString()}
                        </h2>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
                            <ArrowUpRight className="w-4 h-4" />
                            +12% este mes
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Ingresos Totales</p>
                            <p className="text-lg font-bold text-white">$45,000</p>
                        </div>
                        <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] text-slate-500 font-black uppercase">Invertido</p>
                            <p className="text-lg font-bold text-white">$32,500</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                    <History className="w-6 h-6 text-brand-500" />
                    Historial de Transacciones
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.transacciones.length > 0 ? (
                            data.transacciones.map((t) => (
                                <div key={t.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                                            t.monto > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-brand-500/10 text-brand-600"
                                        )}>
                                            {t.monto > 0 ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white capitalize">{t.concepto || "Transacción"}</p>
                                            <p className="text-xs text-slate-500">{new Date(t.fechaPago).toLocaleDateString()} • {t.estado}</p>
                                        </div>
                                    </div>
                                    <div className={cn("text-lg font-black", t.monto > 0 ? "text-emerald-500" : "text-slate-900 dark:text-white")}>
                                        {t.monto > 0 ? "+" : ""}{t.monto.toLocaleString()} <span className="text-xs">{t.moneda}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center space-y-4">
                                <History className="w-12 h-12 text-slate-200 mx-auto" />
                                <p className="text-slate-500 font-medium">No hay transacciones registradas.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showDeposit && (
                <DepositModal
                    userId={session?.user?.id as string}
                    onClose={() => { setShowDeposit(false); loadData(); }}
                />
            )}
        </div>
    );
}
