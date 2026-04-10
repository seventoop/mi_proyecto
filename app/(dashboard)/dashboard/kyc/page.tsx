"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle, XCircle, Search, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { getPendingKYC, updateKYCStatus } from "@/lib/actions/kyc";
import { cn } from "@/lib/utils";

export default function AdminKYCPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        const res = await getPendingKYC();
        if (res.success) {
            setUsers(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAction = async (userId: string, status: "VERIFICADO" | "RECHAZADO") => {
        const reason = status === "RECHAZADO" ? prompt("Motivo del rechazo:") : undefined;
        if (status === "RECHAZADO" && !reason) return;

        await updateKYCStatus(userId, status, reason || undefined);
        fetchUsers();
    };

    const toggleExpand = (id: string) => {
        setExpandedUser(expandedUser === id ? null : id);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Solicitudes de KYC</h1>
                    <p className="text-slate-600 dark:text-slate-500 dark:text-slate-400">Revisa la documentación de los usuarios para aprobar sus perfiles.</p>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300">
                    Pendientes: {users.length}
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No hay solicitudes pendientes</h3>
                    <p className="text-slate-600 dark:text-slate-500 mt-2">Todos los usuarios están verificados o no han enviado documentación.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {users.map((user) => (
                        <div key={user.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all">
                            <div
                                onClick={() => toggleExpand(user.id)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold text-lg">
                                        {user.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">{user.nombre}</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                                        "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                    )}>
                                        {user.kycStatus}
                                    </span>
                                    {expandedUser === user.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                </div>
                            </div>

                            {expandedUser === user.id && (
                                <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-500 uppercase tracking-wider mb-3 mt-4">Documentación presentada</h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                        {user.documentacion && user.documentacion.length > 0 ? (
                                            user.documentacion.map((doc: any) => (
                                                <a
                                                    key={doc.id}
                                                    href={doc.archivoUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 hover:shadow-md transition-all flex items-center gap-3 group"
                                                >
                                                    <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded text-slate-600 dark:text-slate-500 group-hover:text-brand-500 transition-colors">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200 capitalize">{doc.tipo.replace("_", " ")}</p>
                                                        <p className="text-xs text-slate-400">Clic para ver</p>
                                                    </div>
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-600 dark:text-slate-500 col-span-full italic">No hay documentos cargados.</p>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(user.id, "RECHAZADO"); }}
                                            className="px-4 py-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium text-sm transition-colors flex items-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" /> Rechazar
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(user.id, "VERIFICADO"); }}
                                            className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white font-medium text-sm transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Aprobar Verificación
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
