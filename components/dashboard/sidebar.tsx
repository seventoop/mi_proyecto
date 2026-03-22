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
    { section: "Plataforma" },
    { label: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { label: "Riesgos", href: "/dashboard/admin/riesgos", icon: AlertTriangle },
    { section: "Entidades" },
    { label: "Proyectos", href: "/dashboard/admin/proyectos", icon: Building2 },
    { label: "Usuarios", href: "/dashboard/admin/usuarios", icon: UserCheck },
    { label: "KYC", href: "/dashboard/admin/kyc", icon: ShieldCheck },
    { label: "Mandatos", href: "/dashboard/admin/mandatos", icon: BookmarkCheck },
    { label: "Validaciones", href: "/dashboard/admin/validaciones", icon: Workflow },
    { label: "Comercial", href: "/dashboard/admin/comercial", icon: BarChart3 },
    { label: "Planes", href: "/dashboard/admin/planes", icon: CreditCard },
    { section: "Engagement" },
    { label: "CRM / Leads", href: "/dashboard/admin/crm/leads", icon: Users },
    { label: "Etapas de Leads", href: "/dashboard/crm/pipeline", icon: Workflow },
    { label: "BI Métricas", href: "/dashboard/crm/metricas", icon: BarChart3 },
    { section: "CMS & Setup" },
    { label: "Banners", href: "/dashboard/admin/banners", icon: ImageIcon },
    { label: "Testimonios", href: "/dashboard/admin/testimonios", icon: MessageSquare },
    { label: "Automation", href: "/dashboard/admin/logictoop", icon: Workflow },
    { label: "Configuración", href: "/dashboard/admin/configuracion", icon: Settings },
];

// Developer navigation
const developerNavItems = [
    { section: "General" },
    { label: "Dashboard", href: "/dashboard/developer", icon: LayoutDashboard },
    { label: "Mis Proyectos", href: "/dashboard/developer/proyectos", icon: Building2 },
    { section: "Comercial & CRM" },
    { label: "Comercial", href: "/dashboard/developer/comercial", icon: BarChart3 },
    { label: "Leads", href: "/dashboard/developer/leads", icon: Users },
    { label: "Etapas de Leads", href: "/dashboard/crm/pipeline", icon: Workflow },
    { label: "BI Métricas", href: "/dashboard/crm/metricas", icon: BarChart3 },
    { label: "Oportunidades", href: "/dashboard/developer/oportunidades", icon: Target },
    { label: "Reservas", href: "/dashboard/developer/reservas", icon: BookmarkCheck },
    { section: "Cuenta" },
    { label: "Mi Perfil / KYC", href: "/dashboard/developer/mi-perfil/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/developer/configuracion", icon: Settings },
];

// Portafolio Navigation (CLIENTE)
const clienteNavItems = [
    { section: "General" },
    { label: "Mi Portafolio", href: "/dashboard/portafolio", icon: LayoutDashboard },
    { label: "Mis Propiedades", href: "/dashboard/portafolio/propiedades", icon: Home },
    { section: "Cuenta" },
    { label: "Verificar Perfil", href: "/dashboard/portafolio/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/portafolio/configuracion", icon: Settings },
];

// Portafolio Navigation (INVERSOR)
const inversorNavItems = [
    { section: "General" },
    { label: "Mi Portafolio", href: "/dashboard/portafolio", icon: LayoutDashboard },
    { label: "Mis Propiedades", href: "/dashboard/portafolio/propiedades", icon: Home },
    { label: "Mis Inversiones", href: "/dashboard/portafolio/inversiones", icon: ArrowUpCircle },
    { section: "Explorar" },
    { label: "Marketplace", href: "/dashboard/portafolio/marketplace", icon: Building2 },
    { label: "Wallet", href: "/dashboard/portafolio/wallet", icon: CreditCard },
    { label: "Favoritos", href: "/dashboard/portafolio/favoritos", icon: BookmarkCheck },
    { section: "Cuenta" },
    { label: "Mi Perfil KYC", href: "/dashboard/portafolio/kyc", icon: ShieldCheck },
    { label: "Configuración", href: "/dashboard/portafolio/configuracion", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const sidebarOpen = useAppStore((state) => state.sidebarOpen);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const { data: session, status: sessionStatus } = useSession();
    const userRole = (session?.user as any)?.role;

    // Select navigation items based on role
    let navItems: any[] = [];
    
    if (sessionStatus === "loading") {
        navItems = [];
    } else if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
        navItems = adminNavItems;
    } else if (userRole === "VENDEDOR" || userRole === "DESARROLLADOR") {
        navItems = developerNavItems;
    } else if (userRole === "INVERSOR") {
        navItems = inversorNavItems;
    } else if (userRole === "CLIENTE") {
        navItems = clienteNavItems;
    } else {
        navItems = [];
    }

    const [planData, setPlanData] = useState<any>(null);

    useEffect(() => {
        if (session?.user && (userRole === "VENDEDOR" || userRole === "DESARROLLADOR")) {
            const orgId = (session.user as any).orgId;
            if (orgId) {
                getOrgPlanWithUsage(orgId).then(res => {
                    if (res.success) setPlanData(res.data);
                });
            }
        }
    }, [session, userRole]);

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={toggleSidebar}
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl bg-[#09090b] text-white shadow-lg border border-white/10 hover:bg-[#1a1a1f] transition-colors"
            >
                <Menu className="w-5 h-5 opacity-80" />
            </button>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width,transform]",
                    "bg-[#09090b] border-r border-white/[0.06] shadow-2xl flex flex-col",
                    sidebarOpen ? "w-64" : "w-20",
                    "lg:translate-x-0"
                )}
            >
                {/* Logo & Plan */}
                <div className="flex flex-col items-center justify-center p-5 border-b border-white/[0.04] space-y-5">
                    <Link href="/dashboard" className="flex items-center gap-3 w-full justify-center group opacity-90 hover:opacity-100 transition-opacity">
                        {sidebarOpen ? (
                            <Image
                                src="/logo.png"
                                alt="SevenToop"
                                width={160}
                                height={48}
                                className="object-contain"
                                priority
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
                                <Building2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                        )}
                    </Link>

                    {/* Back to public site */}
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center gap-2 rounded-xl transition-all duration-150 group/home",
                            "bg-white/[0.04] hover:bg-brand-500/15 border border-white/[0.06] hover:border-brand-500/30",
                            sidebarOpen
                                ? "w-full px-3 py-2"
                                : "w-9 h-9 justify-center"
                        )}
                    >
                        <Home className="w-4 h-4 text-white/50 group-hover/home:text-brand-400 transition-colors shrink-0" />
                        {sidebarOpen && (
                            <span className="text-xs font-semibold text-white/50 group-hover/home:text-brand-400 transition-colors whitespace-nowrap">
                                Ir al sitio
                            </span>
                        )}
                    </Link>

                    {sidebarOpen && planData && (
                        <div className="w-full animate-in fade-in duration-500 flex flex-col gap-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Plan Activo</span>
                                <PlanBadge plan={planData.planName} />
                            </div>
                            <div className="space-y-2.5 bg-[#161618]/50 p-3 rounded-xl border border-white/[0.04] shadow-inner">
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
                                <div className="pt-2 mt-2 border-t border-white/[0.04]">
                                    <Link
                                        href="/dashboard/developer/planes"
                                        className="group/upgrade flex items-center justify-center gap-2 py-1.5 w-full bg-white/[0.03] hover:bg-white/[0.08] text-white/70 hover:text-white rounded-md text-xs font-semibold uppercase tracking-wider transition-all"
                                    >
                                        <ArrowUpCircle className="w-3.5 h-3.5 text-brand-400 group-hover/upgrade:text-brand-300" />
                                        Mejorar Plan
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {navItems.map((item, idx) => {
                        if (item.section) {
                            if (!sidebarOpen) return <div key={idx} className="h-4 my-2" />;
                            return (
                                <div key={idx} className="px-3 pt-6 pb-2 text-xs font-bold text-white/30 uppercase tracking-widest flex items-center">
                                    {item.section}
                                </div>
                            );
                        }

                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname?.startsWith(item.href));
                        
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={cn(
                                    "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-out",
                                    isActive
                                        ? "bg-white/[0.08] text-white shadow-sm"
                                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                )}
                                <div className="flex items-center justify-center w-6 h-6 shrink-0 relative">
                                    {item.icon && (
                                        <item.icon
                                            className={cn(
                                                "w-[18px] h-[18px] transition-colors duration-200", 
                                                isActive ? "text-brand-400" : "text-white/50 group-hover:text-white/80"
                                            )}
                                            strokeWidth={isActive ? 2.5 : 2}
                                        />
                                    )}
                                </div>
                                {sidebarOpen ? (
                                    <span className={cn(
                                        "truncate transition-opacity duration-200",
                                        isActive ? "font-semibold" : ""
                                    )}>
                                        {item.label}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="px-3 py-4 border-t border-white/[0.04] space-y-1 bg-[#09090b]">
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="group flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-white/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
                    >
                        <div className="flex items-center justify-center w-6 h-6 shrink-0">
                            <LogOut className="w-[18px] h-[18px] text-white/50 group-hover:text-rose-400 transition-colors" />
                        </div>
                        {sidebarOpen && <span className="truncate">Cerrar sesión</span>}
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
                    className="group flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-white/40 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-200"
                >
                    <div className="flex items-center justify-center w-6 h-6 shrink-0">
                        {isDeleting ? (
                            <Loader2 className="w-[18px] h-[18px] animate-spin text-rose-500" />
                        ) : (
                            <Trash2 className="w-[18px] h-[18px] text-white/30 group-hover:text-rose-400 transition-colors" />
                        )}
                    </div>
                    {sidebarOpen && <span className="truncate">Baja / Arrepentimiento</span>}
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="dark:bg-[#09090b] border-white/10 shadow-2xl">
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
                    <AlertDialogCancel className="rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-colors">
                        Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20"
                    >
                        Confirmar Baja
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
