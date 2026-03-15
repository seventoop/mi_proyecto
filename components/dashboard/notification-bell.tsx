"use client";

import { useEffect, useState, useRef, memo } from "react";
import { Bell, BellDot, Check, Info, AlertTriangle, CheckCircle, XCircle, Clock, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getPusherClient, CHANNELS, EVENTS, PUSHER_CHANNELS } from "@/lib/pusher";

interface Notification {
    id: string;
    tipo: "INFO" | "ALERTA" | "EXITO" | "ERROR";
    titulo: string;
    mensaje: string;
    leido: boolean;
    linkAccion?: string;
    createdAt: string;
}

// ─── Sub-component for the list to avoid re-rendering the badge ───
const NotificationList = memo(({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onClose
}: {
    notifications: Notification[],
    onMarkAsRead: (id: string) => void,
    onMarkAllAsRead: () => void,
    onClose: () => void
}) => {
    const getIcon = (tipo: string) => {
        switch (tipo) {
            case "INFO": return <Info className="w-4 h-4 text-brand-500" />;
            case "ALERTA": return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            case "EXITO": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case "ERROR": return <XCircle className="w-4 h-4 text-rose-500" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden z-50">
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notificaciones</h3>
                <div className="flex items-center gap-3">
                    {notifications.some(n => !n.leido) && (
                        <button
                            onClick={onMarkAllAsRead}
                            className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                        >
                            <Check className="w-3 h-3" />
                            Marcar todas
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-600 uppercase tracking-wider font-semibold">Bandeja vacía</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={cn(
                                "p-4 border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer relative",
                                !notif.leido && "bg-brand-50/20 dark:bg-brand-500/5 shadow-inner-glow"
                            )}
                            onClick={() => {
                                if (!notif.leido) onMarkAsRead(notif.id);
                                if (notif.linkAccion) onClose();
                            }}
                        >
                            <div className="flex gap-3">
                                <div className="mt-0.5 flex-shrink-0">
                                    {getIcon(notif.tipo)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-sm font-semibold text-slate-900 dark:text-white leading-tight",
                                        !notif.leido && "text-brand-600 dark:text-brand-400"
                                    )}>
                                        {notif.titulo}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-normal">
                                        {notif.mensaje}
                                    </p>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500 dark:text-slate-500 font-medium">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: es })}
                                    </div>
                                </div>
                                {!notif.leido && (
                                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                                )}
                            </div>
                            {notif.linkAccion && (
                                <Link
                                    href={notif.linkAccion}
                                    className="absolute inset-0 z-10"
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
            {notifications.length > 0 && (
                <div className="p-2 border-t border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-white/5 text-center">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-medium italic">
                        Has llegado al final de tus alertas
                    </p>
                </div>
            )}
        </div>
    );
});

NotificationList.displayName = "NotificationList";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { data: session } = useSession();

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // 1. Intentar suscribirse a notificaciones vía Pusher
        const userId = (session?.user as any)?.id;
        let pusher: any = null;
        let channel: any = null;

        if (userId) {
            pusher = getPusherClient();
            if (pusher) {
                try {
                    const channelName = PUSHER_CHANNELS.getUserChannel(userId);
                    channel = pusher.subscribe(channelName);

                    channel.bind(EVENTS.NOTIFICATION_NEW, (data: any) => {
                        setNotifications(prev => [data, ...prev].slice(0, 50));
                        setUnreadCount(prev => prev + 1);
                    });
                } catch (err) {
                    console.warn("Pusher subscription failed, falling back to polling.", err);
                }
            }
        }

        // 2. Fallback: Polling cada 30 segundos si Pusher no está activo o falla
        const interval = setInterval(() => {
            if (!pusher || pusher.connection.state !== 'connected') {
                fetchNotifications();
            }
        }, 30000);

        return () => {
            if (pusher && channel) {
                const userId = (session?.user as any)?.id;
                if (userId) {
                    const channelName = PUSHER_CHANNELS.getUserChannel(userId);
                    pusher.unsubscribe(channelName);
                }
            }
            clearInterval(interval);
        };
    }, [session]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ all: true }),
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all focus:outline-none"
            >
                {unreadCount > 0 ? (
                    <>
                        {/* Static icon, badge separate */}
                        <Bell className="w-5 h-5 text-brand-500" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-600 rounded-full flex items-center justify-center border border-white dark:border-slate-950 shadow-glow" />
                    </>
                ) : (
                    <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <NotificationList
                        notifications={notifications}
                        onMarkAsRead={markAsRead}
                        onMarkAllAsRead={markAllAsRead}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}
        </div>
    );
}
