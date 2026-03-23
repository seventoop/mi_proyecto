import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import {
    ArrowLeft, Building2, User, Phone, Mail, MapPin,
    Calendar, DollarSign, FileText, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReservaCountdown from "@/components/reservas/reserva-countdown";
import ReservaActions from "@/components/reservas/reserva-actions";
import ReservaHistorial from "@/components/reservas/reserva-historial";
import { projectPathSegment } from "@/lib/project-slug";

async function getReservaDetail(id: string) {
    const reserva = await prisma.reserva.findUnique({
        where: { id },
        include: {
            unidad: {
                include: {
                    manzana: {
                        include: {
                            etapa: {
                                include: { proyecto: { select: { id: true, slug: true, nombre: true, ubicacion: true } } }
                            }
                        }
                    }
                }
            },
            lead: { select: { id: true, nombre: true, email: true, telefono: true } },
            vendedor: { select: { id: true, nombre: true, email: true } }
        }
    });

    if (!reserva) return null;

    // Fetch history manually or via relation if we had it. 
    // In our schema we have HistorialUnidad, let's use that for now or just the base fields.
    const history = await prisma.historialUnidad.findMany({
        where: { unidadId: reserva.unidadId },
        orderBy: { createdAt: "desc" },
        include: { usuario: { select: { nombre: true } } }
    });

    return {
        ...reserva,
        history: history.map(h => ({
            id: h.id,
            tipo: h.estadoNuevo === "CONVERTIDA" ? "conversion" : h.estadoNuevo === "CANCELADA" ? "cancelacion" : "creacion",
            descripcion: h.motivo || `Cambio de estado: ${h.estadoAnterior} -> ${h.estadoNuevo}`,
            usuario: h.usuario.nombre,
            fecha: h.createdAt.toISOString()
        }))
    };
}

export default async function ReservaDetallePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const reserva: any = await getReservaDetail(id);

    if (!reserva) {
        notFound();
    }

    const estadoColors: Record<string, string> = {
        ACTIVA: "bg-emerald-500/10 text-emerald-400",
        VENCIDA: "bg-rose-500/10 text-rose-400",
        CONVERTIDA: "bg-brand-500/10 text-brand-400",
        CANCELADA: "bg-slate-500/10 text-slate-400",
    };

    const proyecto = reserva.unidad.manzana.etapa.proyecto;
    const projectSegment = projectPathSegment(proyecto);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/reservas"
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                            Reserva — {reserva.unidad.numero}
                        </h1>
                        <span className={cn("text-xs font-bold px-3 py-1 rounded-lg", estadoColors[reserva.estado])}>
                            {reserva.estado}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{proyecto.nombre}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-6">
                        <ReservaCountdown
                            fechaVencimiento={reserva.fechaVencimiento.toISOString()}
                            estado={reserva.estado}
                            estadoPago={reserva.estadoPago}
                        />
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <Building2 className="w-4 h-4 text-brand-500" />
                            Unidad reservada
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: "Número", value: reserva.unidad.numero },
                                { label: "Tipo", value: reserva.unidad.tipo || "LOTE" },
                                { label: "Superficie", value: `${reserva.unidad.superficie} m²` },
                                { label: "Frente", value: `${reserva.unidad.frente} m` },
                                { label: "Fondo", value: `${reserva.unidad.fondo} m` },
                                { label: "Orientación", value: reserva.unidad.orientacion || "N/A" },
                                { label: "Esquina", value: reserva.unidad.esEsquina ? "Sí ★" : "No" },
                                { label: "Estado", value: reserva.unidad.estado },
                            ].map((item) => (
                                <div key={item.label}>
                                    <span className="text-xs text-slate-400 block">{item.label}</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-slate-400 block">Precio</span>
                                <span className="text-xl font-bold text-emerald-500">
                                    ${reserva.unidad.precio?.toLocaleString()} {reserva.unidad.moneda}
                                </span>
                            </div>
                            <Link
                                href={`/dashboard/proyectos/${projectSegment}`}
                                className="flex items-center gap-1.5 text-sm text-brand-500 hover:underline font-medium"
                            >
                                Ver proyecto <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                            <User className="w-4 h-4 text-brand-500" />
                            Datos del cliente
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs text-slate-400">Nombre</span>
                                    <p className="font-semibold text-slate-700 dark:text-white">{reserva.lead.nombre}</p>
                                </div>
                                <Link
                                    href={`/dashboard/leads/${reserva.lead.id}`}
                                    className="flex items-center gap-1 text-xs text-brand-500 hover:underline font-medium"
                                >
                                    Ver lead <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <span className="text-xs text-slate-400">Email</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{reserva.lead.email || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <span className="text-xs text-slate-400">Teléfono</span>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">{reserva.lead.telefono || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
                            Historial de la reserva
                        </h3>
                        <ReservaHistorial items={reserva.history} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4">
                            Acciones
                        </h3>
                        <ReservaActions
                            reservaId={reserva.id}
                            estado={reserva.estado}
                            estadoPago={reserva.estadoPago}
                            onAction={() => { }} // This will be handled by router.refresh() inside the component if we want, but since actions are client side, they refresh via fetch.
                        />
                    </div>

                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
                            <MapPin className="w-4 h-4 text-brand-500" />
                            Proyecto
                        </h3>
                        <p className="font-semibold text-slate-700 dark:text-white">{proyecto.nombre}</p>
                        <p className="text-xs text-slate-400 mt-1">{proyecto.ubicacion}</p>
                    </div>

                    {/* Resumen financiero */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">
                            Resumen financiero
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Precio unidad</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-white">
                                    ${reserva.unidad.precio?.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Monto de seña</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-white">
                                    {reserva.montoSena ? `$${reserva.montoSena.toLocaleString()}` : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs text-slate-400">Estado Pago</span>
                                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg",
                                    reserva.estadoPago === "PAGADO" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                                )}>
                                    {reserva.estadoPago}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
