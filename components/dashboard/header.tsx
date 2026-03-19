"use client";

import { useState, useEffect } from "react";
import { Search, Moon, Sun, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { getInitials } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import NotificationBell from "./notification-bell";
import Link from "next/link";

export default function Header() {
    const { theme, setTheme } = useTheme();
    const { data: session } = useSession();
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const userName = (session?.user as any)?.nombre || session?.user?.name || "Usuario";
    const userRoleCode = (session?.user as any)?.role || "INVITADO";

    const roleLabels: Record<string, string> = {
        ADMIN: "Admin",
        VENDEDOR: "Desarrollador",
        CLIENTE: "Propietario",
        INVERSOR: "Inversor",
        INVITADO: "Invitado",
    };
    const userRole = roleLabels[userRoleCode] || userRoleCode;

    // Generate strict breadcrumbs based on pathname for logical SaaS nesting
    const generateBreadcrumbs = () => {
        if (!pathname) return [];
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length === 0) return [];
        
        const paths = [];
        let current = "";
        
        for (let i = 0; i < parts.length; i++) {
            current += `/${parts[i]}`;
            // Format label
            let label = parts[i].charAt(0).toUpperCase() + parts[i].slice(1).replace(/-/g, " ");
            
            // Re-case known modules for visual fidelity
            if (label.toLowerCase() === "dashboard") label = "Dashboard";
            if (label.toLowerCase() === "crm") label = "CRM";
            
            paths.push({ label, href: current });
        }
        
        return paths;
    };

    const breadcrumbs = generateBreadcrumbs();

    return (
        <header className="sticky top-0 z-30 h-[60px] bg-white/80 dark:bg-[#0A0A0C]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.04]">
            <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
                {/* Left Side: Breadcrumbs Navigation */}
                <div className="flex items-center flex-1 ml-10 lg:ml-0">
                    {mounted && (
                        <nav className="hidden sm:flex items-center gap-1.5 text-[13px] font-medium">
                            <span className="text-slate-900 dark:text-zinc-100 font-bold tracking-tight">SevenToop</span>
                            {breadcrumbs.length > 0 && (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 shrink-0" />
                            )}
                            {breadcrumbs.map((crumb, idx) => {
                                const isLast = idx === breadcrumbs.length - 1;
                                return (
                                    <div key={crumb.href} className="flex items-center gap-1.5">
                                        <Link 
                                            href={crumb.href}
                                            className={`transition-colors truncate max-w-[140px] lg:max-w-[200px] ${isLast ? "text-slate-900 dark:text-zinc-100 font-semibold" : "text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"}`}
                                        >
                                            {crumb.label}
                                        </Link>
                                        {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-white/30 shrink-0" />}
                                    </div>
                                );
                            })}
                        </nav>
                    )}
                </div>

                {/* Right Side: Search & Actions */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* Search - compact version */}
                    <div className="hidden lg:flex relative group mr-2">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/40 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-48 xl:w-64 pl-9 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-transparent dark:border-white/[0.06] hover:dark:border-white/[0.1] text-[13px] text-slate-900 dark:text-zinc-200 placeholder-slate-500 dark:placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all font-medium"
                        />
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
                        aria-label="Toggle theme"
                    >
                        {mounted && theme === "dark" ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </button>

                    <div className="text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <NotificationBell />
                    </div>

                    <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />

                    <div className="flex items-center gap-3 pl-1">
                        <div className="text-right hidden sm:flex flex-col items-end justify-center h-full">
                            <span className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100 leading-none mb-1">
                                {userName}
                            </span>
                            <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest leading-none">
                                {userRole}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-orange to-brand-orangeDark flex items-center justify-center text-white text-[11px] font-black shadow-sm ring-2 ring-white dark:ring-white/10">
                            {getInitials(userName)}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
