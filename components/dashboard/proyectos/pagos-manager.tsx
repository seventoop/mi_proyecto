"use client";

import { useState } from "react";
import { DollarSign, CreditCard, Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { solicitarRetiro, gestionarRetiro } from "@/lib/actions/pagos";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PagosManagerProps {
    proyectoId: string;
    pagos: any[];
    cuentas: any[];
    saldoDisponible: number;
    userRole: string;
}

export default function PagosManager({ proyectoId, pagos, cuentas, saldoDisponible, userRole }: PagosManagerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);

    // Forms
    const [accountForm, setAccountForm] = useState({ banco: "", titular: "", cbu: "", alias: "", tipo: "CORRIENTE" });
    const [withdrawForm, setWithdrawForm] = useState({ cuentaId: "", monto: "", concepto: "" });

    const handleAddAccount = async () => {
        if (!accountForm.banco || !accountForm.cbu) return alert("Datos incompletos");
        setLoading(true);
        try {
            // await addCuentaBancaria({ ...accountForm, proyectoId });
            alert("Función deshabilitada temporalmente");
            setShowAddAccount(false);
            setAccountForm({ banco: "", titular: "", cbu: "", alias: "", tipo: "CORRIENTE" });
            router.refresh();
        } finally { setLoading(false); }
    };

    const handleDeleteAccount = async (id: string) => {
        if (!confirm("¿Eliminar cuenta?")) return;
        setLoading(true);
        // try { await deleteCuentaBancaria(id); router.refresh(); } finally { setLoading(false); }
        alert("Función deshabilitada temporalmente");
        setLoading(false);
    };

    const handleWithdraw = async () => {
        if (!withdrawForm.cuentaId || !withdrawForm.monto) return alert("Datos incompletos");
        setLoading(true);
        try {
            const result = await solicitarRetiro({
                proyectoId,
                cuentaId: withdrawForm.cuentaId,
                monto: parseFloat(withdrawForm.monto),
                concepto: withdrawForm.concepto
            });
            if (result.success) {
                setShowWithdraw(false);
                setWithdrawForm({ cuentaId: "", monto: "", concepto: "" });
                router.refresh();
            } else {
                alert(result.error);
            }
        } finally { setLoading(false); }
    };

    const handleStatus = async (id: string, estado: "APROBADO" | "RECHAZADO") => {
        const statusPromise = gestionarRetiro(id, estado).then((res) => {
            if (res.success) {
                router.refresh();
                return `Solicitud ${estado.toLowerCase()}`;
            }
            throw new Error(res.error || `Error al ${estado.toLowerCase()} solicitud`);
        });

        toast.promise(statusPromise, {
            loading: 'Actualizando solicitud...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Saldo y Cuentas */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glass-card p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
                        <h3 className="text-sm font-bold text-slate-500 mb-1">Saldo Disponible</h3>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(saldoDisponible)}</p>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Verificado por Escrow
                        </p>

                        {(userRole === "DESARROLLADOR" || userRole === "ADMIN") && (
                            <button
                                onClick={() => setShowWithdraw(true)}
                                className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                <ArrowUpRight className="w-4 h-4" /> Solicitar Retiro
                            </button>
                        )}
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-brand-500" /> Cuentas Bancarias
                            </h3>
                            <button onClick={() => setShowAddAccount(true)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                <Plus className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {cuentas.length === 0 ? <p className="text-xs text-slate-400 italic">No hay cuentas registradas</p> :
                                cuentas.map(c => (
                                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative group">
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{c.banco}</p>
                                        <p className="text-xs text-slate-500 break-all">{c.cbu}</p>
                                        <p className="text-xs text-slate-400 mt-1 uppercase">{c.tipo} • {c.tiular}</p>
                                        <button onClick={() => handleDeleteAccount(c.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-rose-500 rounded transition-all">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Historial de Pagos */}
                <div className="md:col-span-2 glass-card p-6">
                    <h3 className="font-bold text-lg mb-6 text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        Historial de Movimientos
                    </h3>

                    <div className="space-y-4">
                        {pagos.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p>No hay movimientos registrados</p>
                            </div>
                        ) : (
                            pagos.map(pago => (
                                <div key={pago.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                                            pago.estado === "APROBADO" ? "bg-emerald-100 text-emerald-500" :
                                                pago.estado === "RECHAZADO" ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-500"
                                        )}>
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{pago.concepto}</p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(pago.fechaSolicitud).toLocaleDateString()} • Destino: {pago.cuenta?.banco || "Cuenta eliminada"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(pago.monto)}</p>
                                            <p className={cn("text-xs font-bold uppercase",
                                                pago.estado === "APROBADO" ? "text-emerald-500" :
                                                    pago.estado === "RECHAZADO" ? "text-rose-500" : "text-amber-500"
                                            )}>{pago.estado}</p>
                                        </div>
                                        {userRole === "ADMIN" && pago.estado === "PENDIENTE" && (
                                            <div className="flex gap-1">
                                                <button onClick={() => handleStatus(pago.id, "APROBADO")} title="Aprobar" className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><CheckCircle className="w-4 h-4" /></button>
                                                <button onClick={() => handleStatus(pago.id, "RECHAZADO")} title="Rechazar" className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200"><XCircle className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 p-6 animate-slide-up">
                        <h3 className="font-bold mb-4">Nueva Cuenta Bancaria</h3>
                        <div className="space-y-3">
                            <input className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" placeholder="Banco" value={accountForm.banco} onChange={e => setAccountForm({ ...accountForm, banco: e.target.value })} />
                            <input className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" placeholder="Titular" value={accountForm.titular} onChange={e => setAccountForm({ ...accountForm, titular: e.target.value })} />
                            <input className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" placeholder="CBU / CVU" value={accountForm.cbu} onChange={e => setAccountForm({ ...accountForm, cbu: e.target.value })} />
                            <select className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" value={accountForm.tipo} onChange={e => setAccountForm({ ...accountForm, tipo: e.target.value })}>
                                <option value="CORRIENTE">Cuenta Corriente</option>
                                <option value="AHORRO">Caja de Ahorro</option>
                            </select>
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setShowAddAccount(false)} className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-800">Cancelar</button>
                                <button onClick={handleAddAccount} disabled={loading} className="flex-1 py-2 rounded-xl bg-brand-500 text-white font-bold">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showWithdraw && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
                    <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 p-6 animate-slide-up">
                        <h3 className="font-bold mb-4">Solicitar Retiro de Fondos</h3>
                        <div className="space-y-3">
                            <select className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" value={withdrawForm.cuentaId} onChange={e => setWithdrawForm({ ...withdrawForm, cuentaId: e.target.value })}>
                                <option value="">Seleccionar cuenta destino</option>
                                {cuentas.map(c => <option key={c.id} value={c.id}>{c.banco} - {c.cbu}</option>)}
                            </select>
                            <input type="number" className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" placeholder="Monto a retirar" value={withdrawForm.monto} onChange={e => setWithdrawForm({ ...withdrawForm, monto: e.target.value })} />
                            <input className="w-full p-2.5 rounded-xl border dark:bg-slate-800 dark:border-slate-700" placeholder="Concepto (ej: Materiales)" value={withdrawForm.concepto} onChange={e => setWithdrawForm({ ...withdrawForm, concepto: e.target.value })} />
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => setShowWithdraw(false)} className="flex-1 py-2 rounded-xl bg-slate-200 dark:bg-slate-800">Cancelar</button>
                                <button onClick={handleWithdraw} disabled={loading} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-bold">Solicitar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
