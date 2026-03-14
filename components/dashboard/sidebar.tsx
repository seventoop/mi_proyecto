"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
    LayoutDashboard,
    Building2,
    MapPin,
    Users,
    Target,
    BookmarkCheck,
    BarChart3,
    Home,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    ImageIcon,
    MessageSquare,
    ShieldCheck,
    Trash2,
    AlertTriangle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { deleteUserAccount } from "@/lib/actions/user";
import { toast } from "sonner";

// Admin navigation
const adminNavItems = [
    { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Proyectos", href: "/dashboard/admin/proyectos", icon: Building2, matchPaths: ["/dashboard/proyectos"] },
    { label: "Banners", href: "/dashboard/admin/banners", icon: ImageIcon },
    { label: "Testimonios", href: "/dashboard/admin/testimonios", icon: MessageSquare },
    { label: "KYC / Usuarios", href: "/dashboard/admin/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

// Developer navigation
const developerNavItems = [
    { label: "Dashboard", href: "/dashboard/developer", icon: LayoutDashboard },
    { label: "Mis Proyectos", href: "/dashboard/developer/proyectos", icon: Building2 },
    { label: "Leads", href: "/dashboard/leads", icon: Users },
    { label: "Oportunidades", href: "/dashboard/oportunidades", icon: Target },
    { label: "Reservas", href: "/dashboard/reservas", icon: BookmarkCheck },
    { label: "Mi Perfil / KYC", href: "/dashboard/developer/mi-perfil/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/developer/configuracion", icon: Settings },
];

// User/Investor navigation
const userNavItems = [
    { label: "Portafolio", href: "/dashboard/inversor", icon: LayoutDashboard },
    { label: "Marketplace", href: "/dashboard/inversor/marketplace", icon: Building2 },
    { label: "Mi Perfil / KYC", href: "/dashboard/inversor/mi-perfil", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/inversor/configuracion", icon: Settings },
];




export default function Sidebar() {
    const pathname = usePathname();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VENDEDOR";

    // Select navigation items based on role
    let navItems = developerNavItems;
    if (userRole === "ADMIN") {
        navItems = adminNavItems;
    } else if (userRole === "CLIENTE" || userRole === "INVERSOR") {
        navItems = userNavItems;
    }

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-[#111116] text-white shadow-lg border border-white/10"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen transition-all duration-150 ease-out will-change-[width,transform]",
                    "bg-[#111116] border-r border-brand-orange/15 shadow-[4px_0_24px_-6px_rgba(249,115,22,0.15)]",
                    sidebarOpen ? "w-64" : "w-20",
                    "lg:translate-x-0"
                )}
            >
                {/* Logo + Desktop toggle */}
                <div className="flex items-center h-24 px-4 border-b border-white/10 relative">
                    <Link href="/dashboard" className={cn("flex items-center gap-3 flex-1", !sidebarOpen && "justify-center")}>
                        {sidebarOpen ? (
                            <Image
                                src="/logo.png"
                                alt="SevenToop"
                                width={140}
                                height={40}
                                className="object-contain"
                                priority
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                        )}
                    </Link>
                    <button
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                        title={sidebarOpen ? "Colapsar menú" : "Expandir menú"}
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        // Find the most specific matching nav item.
                        // Also checks optional matchPaths for routes that share the same section
                        // (e.g. /dashboard/proyectos/[id] maps to the Proyectos admin nav item)
                        const matchingItems = navItems.filter(ni => {
                            const paths = [ni.href, ...((ni as any).matchPaths || [])];
                            return paths.some(p => pathname === p || pathname?.startsWith(p + "/"));
                        });
                        const bestMatch = matchingItems.reduce<typeof navItems[0] | null>(
                            (best, ni) => (!best || ni.href.length > best.href.length) ? ni : best,
                            null
                        );
                        const isActive = bestMatch?.href === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-100",
                                    isActive
                                        ? "bg-brand-orange text-white shadow-[0_0_20px_rgba(249,115,22,0.3)]"
                                        : "text-white/70 hover:text-brand-orange hover:bg-white/5"
                                )}
                            >
                                <item.icon
                                    className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-white/50")}
                                />
                                {sidebarOpen && (
                                    <span className="whitespace-nowrap">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="px-3 py-4 border-t border-white/10 space-y-1">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-bold text-white/70 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 text-white/50" />
                        {sidebarOpen && <span>Cerrar sesión</span>}
                    </button>

                    <AccountDeletionButton sidebarOpen={sidebarOpen} />
                </div>
            </aside >
        </>
    );
}

function AccountDeletionButton({ sidebarOpen }: { sidebarOpen: boolean }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteUserAccount();
            if (res.success) {
                await signOut({ callbackUrl: "/" });
            } else {
                toast.error((res as any).error || "Error al eliminar cuenta");
                setIsDeleting(false);
            }
        } catch (error) {
            toast.error("Error de conexión");
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <button
                    disabled={isDeleting}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-xs font-bold text-white/40 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-200"
                >
                    {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    ) : (
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                    )}
                    {sidebarOpen && <span>Baja / Arrepentimiento</span>}
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-[#111116] border-white/10">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black text-white flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-rose-500" />
                        ¿Confirmar baja definitiva?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60 font-medium">
                        Esta acción borrará permanentemente tu cuenta y todos los datos asociados. No se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                    >
                        Confirmar Baja
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
