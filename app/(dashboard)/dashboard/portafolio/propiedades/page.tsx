import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Home, MapPin, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function PortafolioPropiedadesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    const userId = session.user.id as string;

    if (!["CLIENTE", "INVERSOR", "ADMIN", "SUPERADMIN"].includes(role)) redirect("/dashboard");

    const misUnidades = await prisma.unidad.findMany({
        where: { responsableId: userId },
        include: {
            manzana: {
                include: {
                    etapa: { include: { proyecto: true } }
                }
            }
        },
        orderBy: { updatedAt: "desc" }
    });

    const totalInversion = misUnidades.reduce((sum, u) => sum + (u.precio || 0), 0);
    const vendidas = misUnidades.filter(u => u.estado === "VENDIDA").length;
    const reservadas = misUnidades.filter(u => u.estado === "RESERVADA").length;

    return (
        <div className="p-6 w-full space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.investorPropiedades} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total", value: misUnidades.length },
                    { label: "Vendidas", value: vendidas },
                    { label: "Reservadas", value: reservadas },
                    { label: "Inversión Total", value: formatCurrency(totalInversion) },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-5">
                        <p className="text-2xl font-semibold text-brand-500">{value}</p>
                        <p className="text-sm text-slate-500 mt-1">{label}</p>
                    </div>
                ))}
            </div>

            {misUnidades.length === 0 ? (
                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-16 text-center border-dashed">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 dark:text-white mb-2">Sin propiedades aún</h3>
                    <p className="text-slate-500 mb-4">Explorá el marketplace para encontrar tu próxima oportunidad.</p>
                    <Link href="/dashboard/portafolio/marketplace" className="inline-flex px-6 py-3 rounded-xl gradient-brand text-white font-bold text-sm">
                        Ver Marketplace
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {misUnidades.map((unidad) => {
                        const proyecto = unidad.manzana.etapa.proyecto;
                        return (
                            <Link
                                key={unidad.id}
                                href={`/dashboard/portafolio/propiedades/${unidad.id}`}
                                className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6 group hover:border-white/[0.12] hover:bg-white/[0.02] transition-colors ease-[cubic-bezier(0.16,1,0.3,1)] duration-300"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{proyecto.nombre}</h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3 h-3" /> {proyecto.ubicacion}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-xs font-bold",
                                        unidad.estado === "VENDIDA" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {unidad.estado}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500">Unidad</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{unidad.numero}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-500">Superficie</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">{unidad.superficie} m²</span>
                                    </div>
                                    <div className="flex justify-between py-1.5">
                                        <span className="text-slate-500">Precio</span>
                                        <span className="font-bold text-brand-500">{formatCurrency(unidad.precio || 0)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-end text-brand-500 text-sm font-semibold group-hover:gap-2 transition-all">
                                    Ver detalles <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
