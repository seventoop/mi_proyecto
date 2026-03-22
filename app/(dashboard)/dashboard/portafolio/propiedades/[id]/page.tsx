import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { ChevronLeft, Home, MapPin, Building2, Maximize2, FileText, File, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { projectPathSegment } from "@/lib/project-slug";

interface Props { params: { id: string } }

export default async function PortafolioPropiedadDetallePage({ params }: Props) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    const userId = session.user.id as string;

    if (!["CLIENTE", "INVERSOR", "ADMIN", "SUPERADMIN"].includes(role)) redirect("/dashboard");

    const unidad = await prisma.unidad.findUnique({
        where: { id: params.id },
        include: {
            manzana: { include: { etapa: { include: { proyecto: { select: { id: true, slug: true, nombre: true, ubicacion: true, imagenPortada: true } } } } } }
        }
    });

    if (!unidad) notFound();
    if (role !== "ADMIN" && role !== "SUPERADMIN" && unidad.responsableId !== userId) redirect("/dashboard/portafolio");

    const proyecto = unidad.manzana.etapa.proyecto;
    const projectSegment = projectPathSegment(proyecto);
    const etapa = unidad.manzana.etapa;
    const manzana = unidad.manzana;

    const [pagos, documentos] = await Promise.all([
        prisma.pago.findMany({ where: { usuarioId: userId, proyectoId: proyecto.id }, orderBy: { fechaPago: "desc" } }),
        prisma.documentacion.findMany({ where: { usuarioId: userId, proyectoId: proyecto.id }, orderBy: { createdAt: "desc" } })
    ]);

    const estadoConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
        VENDIDA: { color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle },
        RESERVADA: { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Clock },
        DISPONIBLE: { color: "text-slate-400 bg-slate-400/10 border-slate-400/20", icon: AlertCircle },
    };
    const estadoInfo = estadoConfig[unidad.estado] ?? estadoConfig.DISPONIBLE;
    const EstadoIcon = estadoInfo.icon;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">
            <Link href="/dashboard/portafolio/propiedades" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-500 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Volver a Mis Propiedades
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Unidad {unidad.numero}</h1>
                    <p className="text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {proyecto.nombre} — {proyecto.ubicacion}</p>
                </div>
                <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold", estadoInfo.color)}>
                    <EstadoIcon className="w-4 h-4" /> {unidad.estado}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <Home className="w-5 h-5 text-brand-500" /> Detalles
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                ["Número", unidad.numero],
                                ["Tipo", unidad.tipo],
                                ["Superficie", unidad.superficie ? `${unidad.superficie} m²` : "—"],
                                ["Frente", unidad.frente ? `${unidad.frente} m` : "—"],
                                ["Fondo", unidad.fondo ? `${unidad.fondo} m` : "—"],
                                ["Orientación", unidad.orientacion || "—"],
                                ["Esquina", unidad.esEsquina ? "Sí" : "No"],
                                ["Manzana", manzana.nombre],
                                ["Etapa", etapa.nombre],
                            ].map(([label, value]) => (
                                <div key={label} className="py-2 border-b border-slate-100 dark:border-slate-800">
                                    <p className="text-xs text-slate-500">{label}</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{value}</p>
                                </div>
                            ))}
                            <div className="col-span-2 pt-2">
                                <p className="text-xs text-slate-500">Precio de compra</p>
                                <p className="text-xl font-bold text-brand-500">{formatCurrency(unidad.precio || 0)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <FileText className="w-5 h-5 text-brand-500" /> Historial de Pagos
                        </h2>
                        {pagos.length === 0
                            ? <p className="text-sm text-slate-500 text-center py-6">No hay pagos registrados.</p>
                            : pagos.map((pago) => (
                                <div key={pago.id} className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{pago.concepto || "Pago"}</p>
                                        <p className="text-xs text-slate-500">{new Date(pago.fechaPago).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(Number(pago.monto))}</p>
                                        <p className={cn("text-xs font-semibold", pago.estado === "VERIFICADO" || pago.estado === "CONFIRMADO" ? "text-emerald-500" : "text-amber-500")}>{pago.estado}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <File className="w-5 h-5 text-brand-500" /> Documentos
                        </h2>
                        {documentos.length === 0
                            ? <p className="text-sm text-slate-500 text-center py-4">Sin documentos.</p>
                            : documentos.map((doc) => (
                                <a key={doc.id} href={doc.archivoUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-brand-500/10 transition-colors mb-2 group">
                                    <FileText className="w-5 h-5 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{doc.tipo}</p>
                                        <p className="text-xs text-slate-500">{new Date(doc.createdAt).toLocaleDateString("es-ES")}</p>
                                    </div>
                                </a>
                            ))
                        }
                    </div>
                    <div className="glass-card p-6 space-y-3">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acciones</h2>
                        <Link href={`/dashboard/proyectos/${projectSegment}?tab=masterplan&highlight=${unidad.id}`}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-brand-500/10 text-brand-500 font-semibold text-sm hover:bg-brand-500/20 transition-colors">
                            <Maximize2 className="w-4 h-4" /> Ver en Masterplan
                        </Link>
                        <Link href="/dashboard/portafolio/propiedades"
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Home className="w-4 h-4" /> Mis Propiedades
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
