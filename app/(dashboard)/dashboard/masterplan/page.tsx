import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { MapPin, ArrowRight, Building2, Eye } from "lucide-react";

export default async function MasterplanIndexPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const projectsRaw = await prisma.proyecto.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: {
                            unidades: true
                        }
                    }
                }
            }
        }
    });

    const projects = projectsRaw.map(p => ({
        ...p,
        _count: {
            unidades: p.etapas.reduce((acc, etapa) =>
                acc + etapa.manzanas.reduce((mAcc, m) => mAcc + m.unidades.length, 0), 0
            )
        }
    }));

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Masterplans & Tours 360°
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Accede al plano interactivo y recorridos virtuales de tus proyectos.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div
                        key={project.id}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500/50 transition-all hover:shadow-lg"
                    >
                        <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                            {project.imagenPortada ? (
                                <img
                                    src={project.imagenPortada}
                                    alt={project.nombre}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <MapPin className="h-12 w-12 text-slate-300" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                            {/* Floating badge for status */}
                            <div className="absolute top-3 right-3 flex gap-2">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-md shadow-sm ${project.estado === 'EN_VENTA' ? 'bg-emerald-500/90 text-white' :
                                    project.estado === 'VENDIDO' ? 'bg-rose-500/90 text-white' :
                                        'bg-brand-500/90 text-white'
                                    }`}>
                                    {project.estado}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                            <div className="mb-2">
                                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10 uppercase tracking-wide">
                                    {project.tipo}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                                {project.nombre}
                            </h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-6 flex-1">
                                {project.descripcion || "Sin descripción disponible para este proyecto."}
                            </p>

                            <div className="mt-auto border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                                <div className="flex items-center text-xs text-slate-500">
                                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">{project._count.unidades}</span> Unidades Totales
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Link
                                        href={`/dashboard/proyectos/${project.id}?tab=masterplan`}
                                        className="flex items-center justify-center rounded-xl bg-brand-500/10 px-4 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-500/20 dark:text-brand-400 dark:hover:bg-brand-400/10 transition-all active:scale-95"
                                    >
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Masterplan
                                    </Link>
                                    <Link
                                        href={`/dashboard/proyectos/${project.id}?tab=tour360`}
                                        className="flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Tour 360°
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {projects.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                        <MapPin className="mx-auto h-16 w-16 text-slate-300" />
                        <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">No hay proyectos activos</h3>
                        <p className="mt-2 text-slate-500 max-w-sm mx-auto">
                            Comienza creando un proyecto en la sección de Proyectos para habilitar su Masterplan y Tour 360.
                        </p>
                        <div className="mt-8">
                            <Link
                                href="/dashboard/proyectos"
                                className="inline-flex items-center rounded-xl gradient-brand px-6 py-3 text-sm font-bold text-white shadow-glow hover:shadow-glow-lg transition-all"
                            >
                                <Building2 className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                Ir a Gestión de Proyectos
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
