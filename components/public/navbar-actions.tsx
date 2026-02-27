"use client";

import { useState, useEffect } from "react";
import { Globe, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavbarLinks from "./navbar-links";

interface NavItem {
    label: string;
    href: string;
}

export default function NavbarActions({ items }: { items: NavItem[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [lang, setLang] = useState<"es" | "en">("es");
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("lang");
        if (saved === "en") setLang("en");
    }, []);

    const changeLang = (newLang: "es" | "en") => {
        setLang(newLang);
        localStorage.setItem("lang", newLang);
    };

    if (!mounted) return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-foreground/5 animate-pulse" />
            <div className="w-8 h-8 rounded-xl bg-foreground/5 animate-pulse" />
            <div className="w-24 h-10 rounded-xl bg-brand-orange/50 animate-pulse" />
        </div>
    );

    return (
        <>
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl hover:bg-foreground/5 text-foreground/60 hover:text-brand-orange transition-colors text-xs font-bold">
                            <Globe className="w-4 h-4" />
                            <span>{lang.toUpperCase()}</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[120px]">
                        <DropdownMenuItem onClick={() => changeLang("es")} className={cn("cursor-pointer font-semibold", lang === "es" && "text-brand-orange")}>
                            🇦🇷 Español
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeLang("en")} className={cn("cursor-pointer font-semibold", lang === "en" && "text-brand-orange")}>
                            🇺🇸 English
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-xl hover:bg-foreground/5 text-foreground/60 hover:text-brand-orange transition-colors"
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <Link href="/login" className="ml-2 px-8 py-2.5 bg-brand-orange text-white rounded-xl text-sm font-bold shadow-lg hover:bg-brand-orangeDark transition-all">
                    Ingresar
                </Link>
            </div>

            {/* Mobile Buttons */}
            <div className="md:hidden flex items-center gap-2">
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground"
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-xl bg-brand-orange text-white shadow-lg"
                >
                    {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-[80px] left-0 right-0 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-black overflow-hidden z-50 shadow-2xl"
                    >
                        <div className="px-6 py-4 space-y-2">
                            <NavbarLinks items={items} mobile onItemClick={() => setIsOpen(false)} />

                            <div className="flex items-center gap-2 p-3">
                                <Globe className="w-4 h-4 text-foreground/40" />
                                <button onClick={() => changeLang("es")} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", lang === "es" ? "bg-brand-orange text-white" : "bg-foreground/5 text-foreground/60")}>ES</button>
                                <button onClick={() => changeLang("en")} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all", lang === "en" ? "bg-brand-orange text-white" : "bg-foreground/5 text-foreground/60")}>EN</button>
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full py-4 bg-brand-gray text-white rounded-xl font-black uppercase text-xs tracking-widest text-center shadow-lg">
                                    Dashboard
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
