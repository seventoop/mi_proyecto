"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, ChevronDown, Globe, Check } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { useLanguage } from "@/components/providers/language-provider";

type NavItemKey =
    | "inicio"
    | "proyectos"
    | "comoFunciona"
    | "desarrolladores"
    | "blog"
    | "testimonios"
    | "contacto";

type NavItem =
    | {
        key: NavItemKey;
        href: string;
        type: "route";
    }
    | {
        key: NavItemKey;
        href: string;
        type: "anchor";
        anchor: "#inicio" | "#como-funciona" | "#testimonios";
    };

const NAV_ITEMS: NavItem[] = [
    { key: "inicio", href: "/#inicio", type: "anchor", anchor: "#inicio" },
    { key: "proyectos", href: "/proyectos", type: "route" },
    { key: "comoFunciona", href: "/#como-funciona", type: "anchor", anchor: "#como-funciona" },
    { key: "desarrolladores", href: "/desarrolladores", type: "route" },
    { key: "blog", href: "/blog", type: "route" },
    { key: "testimonios", href: "/#testimonios", type: "anchor", anchor: "#testimonios" },
    { key: "contacto", href: "/contacto", type: "route" },
];

const HEADER_OFFSET = 96;

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string>("#inicio");
    const { locale, dictionary: t, setLanguage } = useLanguage();

    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

    const anchorItems = useMemo(
        () => NAV_ITEMS.filter((item): item is Extract<NavItem, { type: "anchor" }> => item.type === "anchor"),
        []
    );

    const changeLocale = useCallback((nextLocale: "es" | "en") => {
        setLanguage(nextLocale);
    }, [setLanguage]);

    const scrollToAnchor = useCallback((anchor: string) => {
        const element = document.querySelector(anchor);
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        const top = Math.max(absoluteTop - HEADER_OFFSET, 0);

        window.scrollTo({
            top,
            behavior: "smooth",
        });

        return true;
    }, []);



    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY >= 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileMenuOpen]);

    useEffect(() => {
        if (pathname !== "/") return;

        const sections = anchorItems
            .map((item) => document.querySelector(item.anchor))
            .filter(Boolean) as HTMLElement[];

        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (!visibleEntries.length) return;

                const id = `#${visibleEntries[0].target.id}`;
                setActiveSection(id);
            },
            {
                root: null,
                rootMargin: `-${HEADER_OFFSET}px 0px -45% 0px`,
                threshold: [0.2, 0.35, 0.5, 0.75],
            }
        );

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, [pathname, anchorItems]);

    useEffect(() => {
        if (pathname !== "/") return;

        const hash = window.location.hash;
        if (!hash) {
            setActiveSection("#inicio");
            return;
        }

        const matchingItem = anchorItems.find((item) => item.anchor === hash);
        if (matchingItem) {
            setActiveSection(hash);

            const timeout = setTimeout(() => {
                scrollToAnchor(hash);
            }, 80);

            return () => clearTimeout(timeout);
        }
    }, [pathname, anchorItems, scrollToAnchor]);

    const handleNavClick = useCallback(
        (item: NavItem) => {
            setMobileMenuOpen(false);

            if (item.type === "anchor") {
                if (pathname === "/") {
                    setActiveSection(item.anchor);

                    const ok = scrollToAnchor(item.anchor);
                    if (ok) {
                        window.history.replaceState(null, "", item.href);
                        return;
                    }
                }

                router.push(item.href);
            }
        },
        [pathname, router, scrollToAnchor]
    );

    const isItemActive = useCallback(
        (item: NavItem) => {
            if (item.type === "route") {
                return pathname === item.href;
            }

            if (pathname !== "/") return false;
            return activeSection === item.anchor;
        },
        [pathname, activeSection]
    );



    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ease-in-out",
                "border-b border-border/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85",
                "dark:border-white/10 dark:bg-[#1A1A2E]/95 dark:supports-[backdrop-filter]:bg-[#1A1A2E]/85",
                scrolled ? "py-1 shadow-md" : "py-2 shadow-sm"
            )}
        >
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
                <Link
                    href="/#inicio"
                    className="relative z-10 flex flex-shrink-0 items-center self-center"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={t.common.goHome}
                >
                    <Image
                        src="/logo-navbar.png"
                        alt="SevenToop"
                        width={140}
                        height={40}
                        priority
                        className="h-auto w-[120px] object-contain sm:w-[140px] translate-y-[5px]"
                    />
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
                    {NAV_ITEMS.map((item) => {
                        const active = isItemActive(item);
                        const label = t.nav[item.key];

                        if (item.type === "anchor") {
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleNavClick(item)}
                                    className={cn(
                                        "whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                                        "text-foreground/80 hover:bg-brand-orange/5 hover:text-brand-orange",
                                        active && "bg-brand-orange/5 text-brand-orange"
                                    )}
                                    aria-current={active ? "page" : undefined}
                                >
                                    {label}
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className={cn(
                                    "whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                                    "text-foreground/80 hover:bg-brand-orange/5 hover:text-brand-orange",
                                    active && "bg-brand-orange/5 text-brand-orange"
                                )}
                                aria-current={active ? "page" : undefined}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="hidden lg:block">
                        <button
                            type="button"
                            onClick={() => changeLocale(locale === "es" ? "en" : "es")}
                            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[13px] font-bold text-foreground/70 transition-colors hover:bg-brand-orange/5 hover:text-brand-orange"
                            aria-label={locale === "es" ? "Switch to English" : "Cambiar a Español"}
                        >
                            <Globe className="h-4 w-4" />
                            <span>{t.common.languageShort}</span>
                        </button>
                    </div>

                    <div className="hidden lg:block">
                        <ThemeToggle />
                    </div>

                    <div className="hidden lg:block">
                        {session?.user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold text-foreground transition-colors hover:bg-brand-orange/5 hover:text-brand-orange">
                                    {session.user.name || "Usuario"}
                                    <ChevronDown className="h-4 w-4" />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                    align="end"
                                    className="w-52 p-1.5 bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/40 rounded-xl"
                                >
                                    <DropdownMenuItem asChild className="cursor-pointer font-semibold rounded-lg px-3 py-2.5 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10">
                                        <Link href="/dashboard">{t.common.dashboard}</Link>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                        onClick={() => signOut()}
                                        className="cursor-pointer font-semibold rounded-lg px-3 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 focus:bg-rose-50 dark:focus:bg-rose-500/10 focus:text-rose-500"
                                    >
                                        {t.common.logout}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                href="/login"
                                className="inline-flex min-w-[100px] items-center justify-center rounded-full bg-brand-orange px-6 py-2 text-[13px] font-bold text-white transition-all hover:scale-[1.03] hover:bg-brand-orangeDark active:scale-95"
                            >
                                {t.common.login}
                            </Link>
                        )}
                    </div>

                    <div className="lg:hidden">
                        <ThemeToggle />
                    </div>

                    <button
                        type="button"
                        className="rounded-lg p-2 text-foreground transition-colors hover:bg-foreground/5 lg:hidden"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label={mobileMenuOpen ? t.common.closeMenu : t.common.openMenu}
                        aria-expanded={mobileMenuOpen}
                        aria-controls="mobile-menu"
                    >
                        {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            <div
                id="mobile-menu"
                className={cn(
                    "fixed inset-0 z-40 transition-all duration-300 lg:hidden",
                    "top-[calc(3.5rem+1px)] sm:top-[calc(4rem+1px)]",
                    mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                )}
            >
                <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />

                <div
                    className={cn(
                        "relative max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-white shadow-2xl transition-transform duration-300",
                        "dark:border-white/10 dark:bg-[#1A1A2E]",
                        mobileMenuOpen ? "translate-y-0" : "-translate-y-4"
                    )}
                >
                    <div className="space-y-1 p-6">
                        {NAV_ITEMS.map((item) => {
                            const active = isItemActive(item);
                            const label = t.nav[item.key];

                            if (item.type === "anchor") {
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => handleNavClick(item)}
                                        className={cn(
                                            "w-full rounded-xl px-4 py-3.5 text-left text-base font-semibold transition-colors",
                                            "text-foreground/90 hover:bg-brand-orange/5 hover:text-brand-orange",
                                            active && "bg-brand-orange/5 text-brand-orange"
                                        )}
                                        aria-current={active ? "page" : undefined}
                                    >
                                        {label}
                                    </button>
                                );
                            }

                            return (
                                <Link
                                    key={item.key}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        "block rounded-xl px-4 py-3.5 text-base font-semibold transition-colors",
                                        "text-foreground/90 hover:bg-brand-orange/5 hover:text-brand-orange",
                                        active && "bg-brand-orange/5 text-brand-orange"
                                    )}
                                    aria-current={active ? "page" : undefined}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="px-6 pb-2">
                        <div className="rounded-xl px-4 py-2">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground/50">
                                <Globe className="h-4 w-4" />
                                <span>{t.common.languageName}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => changeLocale("es")}
                                    className={cn(
                                        "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                                        locale === "es"
                                            ? "border-brand-orange bg-brand-orange text-white"
                                            : "border-border bg-background text-foreground hover:bg-brand-orange/5"
                                    )}
                                >
                                    ES
                                </button>

                                <button
                                    type="button"
                                    onClick={() => changeLocale("en")}
                                    className={cn(
                                        "rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                                        locale === "en"
                                            ? "border-brand-orange bg-brand-orange text-white"
                                            : "border-border bg-background text-foreground hover:bg-brand-orange/5"
                                    )}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mx-6 border-t border-border/30 px-6 pb-6 pt-2">
                        {session?.user ? (
                            <div className="space-y-3 pt-4">
                                <div className="px-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {t.common.hello},{" "}
                                    <span className="text-foreground">
                                        {session.user.name || "Usuario"}
                                    </span>
                                </div>

                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full rounded-xl bg-brand-orange py-4 text-center text-base font-bold text-white transition-all active:scale-[0.98]"
                                >
                                    {t.common.dashboard}
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => {
                                        signOut();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="block w-full rounded-xl py-3 text-center font-semibold text-destructive transition-all hover:bg-destructive/5"
                                >
                                    {t.common.logout}
                                </button>
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="mt-4 block w-full rounded-xl bg-brand-orange py-4 text-center text-base font-bold text-white transition-all active:scale-[0.98]"
                            >
                                {t.common.login}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}