import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { Home, MapPin, Calendar, FileText, Eye, MapIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function ClienteDashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    // Fetch client properties (units where they are responsible)
    const misUnidades = await prisma.unidad.findMany({
        where: {
            responsableId: session.user.id
        },
        include: {
            manzana: {
                include: {
                    etapa: {
                        include: {
                            proyecto: true
                        }
                    }
                }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    const totalInversion = misUnidades.reduce((sum, u) => sum + (u.precio || 0), 0);
    const vendidas = misUnidades.filter(u => u.estado === "VENDIDA").length;
    const reservadas = misUnidades.filter(u => u.estado === "RESERVADA").length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.clientePropiedades} />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Propiedades", value: misUnidades.length, icon: Home, color: "text-brand-500" },
                    { label: "Vendidas", value: vendidas, icon: FileText, color: "text-emerald-500" },
                    { label: "Reservadas", value: reservadas, icon: Calendar, color: "text-amber-500" },
                    { label: "Inversión Total", value: formatCurrency(totalInversion), icon: Home, color: "text-slate-700 dark:text-white" },
                ].map((stat) => (
                    <div key={stat.label} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className={`w-8 h-8 ${stat.color}`} />
                        </div>
                        <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                        <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Properties List */}
            {misUnidades.length === 0 ? (
                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-12 text-center border-dashed">
                    <Home className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">
                        Aún no tienes propiedades
                    </h3>
                    <p className="text-slate-500 mb-6">
                        Explora nuestros proyectos y comienza a invertir
                    </p>
                    <Link
                        href="/proyectos"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg transition-all"
                    >
                        Ver Proyectos Disponibles
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {misUnidades.map((unidad) => {
                        const proyecto = unidad.manzana.etapa.proyecto;
                        return (
                            <div key={unidad.id} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6 group hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors ease-[cubic-bezier(0.16,1,0.3,1)] duration-300">
                                {/* Project Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                            {proyecto.nombre}
                                        </h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {proyecto.ubicacion}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${unidad.estado === "VENDIDA"
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-amber-500/10 text-amber-500"
                                        }`}>
                                        {unidad.estado}
                                    </span>
                                </div>

                                {/* Unit Details */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-sm text-slate-500">Unidad</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{unidad.numero}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-sm text-slate-500">Lote / Manzana</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {unidad.manzana.nombre}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-sm text-slate-500">Superficie</span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">{unidad.superficie} m²</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm text-slate-500">Precio</span>
                                        <span className="text-lg font-bold text-brand-500">{formatCurrency(unidad.precio || 0)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {proyecto.masterplanSVG && (
                                        <Link
                                            href={`/dashboard/proyectos/${proyecto.id}?tab=masterplan&highlight=${unidad.id}`}
                                            className="flex-1 px-4 py-2 rounded-lg bg-brand-500/10 text-brand-500 font-semibold text-sm hover:bg-brand-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <MapIcon className="w-4 h-4" />
                                            Ver en Masterplan
                                        </Link>
                                    )}
                                    <Link
                                        href={`/dashboard/cliente/propiedades/${unidad.id}`}
                                        className="flex-1 px-4 py-2 rounded-lg gradient-brand text-white font-semibold text-sm shadow-glow hover:shadow-glow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver Detalles
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
