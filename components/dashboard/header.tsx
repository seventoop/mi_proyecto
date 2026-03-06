"use client";

import { useState, useEffect } from "react";
import { Bell, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAppStore } from "@/lib/store";
import { getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";
import NotificationBell from "./notification-bell";

export default function Header() {
    const { theme, setTheme } = useTheme();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const userName = (session?.user as any)?.nombre || session?.user?.name || "Usuario";
    const userRoleCode = (session?.user as any)?.role || "INVITADO";

    // Mapeo de roles a etiquetas legibles
    const roleLabels: Record<string, string> = {
        ADMIN: "ADMIN",
        VENDEDOR: "DESARROLLADOR",
        CLIENTE: "CLIENTE",
        INVERSOR: "INVERSOR",
        INVITADO: "INVITADO",
    };

    const userRole = roleLabels[userRoleCode] || userRoleCode;

    return (
        <header className="sticky top-0 z-20 h-16 glass border-b border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between h-full px-6">
                {/* Search */}
                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 dark:text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar proyectos, leads, unidades..."
                            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-slate-300 placeholder-slate-700 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 focus:border-brand-orange transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {mounted && theme === "dark" ? (
                            <Sun className="w-5 h-5 text-slate-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-slate-900" />
                        )}
                    </button>

                    {/* Notifications */}
                    <NotificationBell />

                    {/* Separator */}
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2" />

                    {/* User */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="flex items-center justify-end gap-1.5">
                                {(session?.user as any)?.kycStatus === "APROBADO" && (
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-black animate-pulse-slow">
                                        ✔ VERIFICADO
                                    </span>
                                )}
                                <p className="text-sm font-black text-slate-900 dark:text-slate-200">
                                    {userName}
                                </p>
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-400">{userRole}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center text-white text-sm font-black shadow-lg shadow-brand-orange/20 border border-white/10">
                            {getInitials(userName)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
