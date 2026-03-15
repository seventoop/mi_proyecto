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
    Loader2,
    CreditCard,
    UserCheck,
    Workflow,
    ArrowUpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { getOrgPlanWithUsage } from "@/lib/actions/plan-actions";
import PlanBadge from "@/components/saas/PlanBadge";
import UsageMeter from "@/components/saas/UsageMeter";
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
    { label: "CRM / Leads", href: "/dashboard/admin/crm/leads", icon: Users },
    { label: "Proyectos", href: "/dashboard/admin/proyectos", icon: Building2, matchPaths: ["/dashboard/proyectos"] },
    { label: "Banners", href: "/dashboard/admin/banners", icon: ImageIcon },
    { label: "Testimonios", href: "/dashboard/admin/testimonios", icon: MessageSquare },
    { label: "KYC", href: "/dashboard/admin/kyc", icon: ShieldCheck },
    { label: "Usuarios", href: "/dashboard/admin/users", icon: UserCheck },
    { label: "Planes", href: "/dashboard/admin/planes", icon: CreditCard },
    { label: "Riesgos", href: "/dashboard/admin/riesgos", icon: AlertTriangle },
    { label: "Configuración", href: "/dashboard/admin/configuracion", icon: Settings },
];

// Developer navigation
const developerNavItems = [
    { label: "Dashboard", href: "/dashboard/developer", icon: LayoutDashboard },
    { label: "Mis Proyectos", href: "/dashboard/developer/proyectos", icon: Building2 },
    { label: "Leads", href: "/dashboard/developer/leads", icon: Users },
    { label: "Pipeline CRM", href: "/dashboard/developer/crm/pipeline", icon: Workflow },
    { label: "BI Métricas", href: "/dashboard/developer/crm/metricas", icon: BarChart3 },
    { label: "Oportunidades", href: "/dashboard/developer/oportunidades", icon: Target },
    { label: "Reservas", href: "/dashboard/developer/reservas", icon: BookmarkCheck },
    { label: "Mi Perfil / KYC", href: "/dashboard/developer/mi-perfil/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/developer/configuracion", icon: Settings },
];
// Portafolio Navigation (CLIENTE)
const clienteNavItems = [
    { label: "Mi Portafolio", href: "/dashboard/portafolio", icon: LayoutDashboard },
    { label: "Mis Propiedades", href: "/dashboard/portafolio/propiedades", icon: Home },
    { label: "Verificar Perfil", href: "/dashboard/portafolio/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/portafolio/configuracion", icon: Settings },
];

// Portafolio Navigation (INVERSOR)
const inversorNavItems = [
    { label: "Mi Portafolio", href: "/dashboard/portafolio", icon: LayoutDashboard },
    { label: "Mis Propiedades", href: "/dashboard/portafolio/propiedades", icon: Home },
    { label: "Mis Inversiones", href: "/dashboard/portafolio/inversiones", icon: ArrowUpCircle },
    { label: "Marketplace", href: "/dashboard/portafolio/marketplace", icon: Building2 },
    { label: "Wallet", href: "/dashboard/portafolio/wallet", icon: CreditCard },
    { label: "Favoritos", href: "/dashboard/portafolio/favoritos", icon: BookmarkCheck },
    { label: "Mi Perfil KYC", href: "/dashboard/portafolio/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/portafolio/configuracion", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "VENDEDOR";

    // Select navigation items based on role
    let navItems = developerNavItems;
    if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
        navItems = adminNavItems;
    } else if (userRole === "INVERSOR") {
        navItems = inversorNavItems;
    } else if (userRole === "CLIENTE") {
        navItems = clienteNavItems;
    }

    const [isMounted, setIsMounted] = useState(false);
    const [planData, setPlanData] = useState<any>(null);

    useEffect(() => {
        setIsMounted(true);
        if (session?.user && (userRole === "VENDEDOR" || userRole === "DESARROLLADOR")) {
            const orgId = (session.user as any).orgId;
            if (orgId) {
                getOrgPlanWithUsage(orgId).then(res => {
                    if (res.success) setPlanData(res.data);
                });
            }
        }
    }, [session, userRole]);

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
                {/* Logo + Desktop toggle + Plan */}
                <div className="flex flex-col border-b border-white/10">
                    <div className="flex items-center h-24 px-4 relative">
                        <Link href="/dashboard" className={cn("flex items-center gap-3 flex-1", !sidebarOpen && "justify-center")}>
                            {sidebarOpen ? (
                                <Image
                                    src="/logo.png"
                                    alt="SevenToop"
                                    width={180}
                                    height={54}
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

                    {sidebarOpen && planData && (
                        <div className="w-full px-4 pb-4 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Estado Cuenta</span>
                                <PlanBadge plan={planData.planName} />
                            </div>
                            <div className="space-y-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                                <UsageMeter
                                    label="Leads"
                                    resource="leads"
                                    current={planData.usage.leads.current}
                                    limit={planData.usage.leads.limit}
                                />
                                <UsageMeter
                                    label="Proyectos"
                                    resource="proyectos"
                                    current={planData.usage.proyectos.current}
                                    limit={planData.usage.proyectos.limit}
                                />
                                <Link
                                    href="/dashboard/developer/planes"
                                    className="flex items-center justify-center gap-2 py-1.5 w-full bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange rounded-lg text-[9px] font-black uppercase transition-all"
                                >
                                    <ArrowUpCircle className="w-3 h-3" />
                                    Gestionar Plan
                                </Link>
                            </div>
                        </div>
                    )}
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

                    {userRole !== "ADMIN" && userRole !== "SUPERADMIN" && (
                        <AccountDeletionButton sidebarOpen={sidebarOpen} />
                    )}
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
