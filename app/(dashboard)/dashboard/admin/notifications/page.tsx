"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { getNotifications, markAsRead, deleteNotification, markAllAsRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";
import Link from "next/link"; // Ensure Link is imported

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL"); // ALL, UNREAD

    const fetchNotifications = async () => {
        setLoading(true);
        const res = await getNotifications();
        if (res.success) {
            setNotifications(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkRead = async (id: string) => {
        await markAsRead(id);
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
    };

    const handleDelete = async (id: string) => {
        await deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === "UNREAD") return !n.leido;
        return true;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case "EXITO": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
            case "ALERTA": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case "ERROR": return <XCircle className="w-5 h-5 text-rose-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Centro de Notificaciones</h1>
                    <p className="text-slate-500 text-sm">Mantente al día con lo que sucede en la plataforma.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter(filter === "ALL" ? "UNREAD" : "ALL")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                            filter === "UNREAD"
                                ? "bg-brand-50 border-brand-200 text-brand-600"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {filter === "ALL" ? "Ver No Leídas" : "Ver Todas"}
                    </button>
                    <button
                        onClick={handleMarkAllRead}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                        <Check className="w-3 h-3" /> Marcar todo leído
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-slate-500">No tienes notificaciones {filter === "UNREAD" ? "sin leer" : ""}</h3>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                "relative p-4 rounded-xl border transition-all group",
                                notif.leido
                                    ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                    : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30"
                            )}
                        >
                            <div className="flex gap-4">
                                <div className="mt-1 shrink-0">
                                    {getIcon(notif.tipo)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className={cn("text-sm font-bold", notif.leido ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white")}>
                                        {notif.titulo}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.mensaje}</p>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-xs text-slate-400">
                                            {new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {notif.linkAccion && (
                                            <Link href={notif.linkAccion} className="text-xs font-bold text-brand-500 hover:underline">
                                                Ver Detalle →
                                            </Link>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notif.leido && (
                                        <button
                                            onClick={() => handleMarkRead(notif.id)}
                                            className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Marcar como leído"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notif.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
