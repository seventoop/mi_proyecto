import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";
import { getReservasByProyecto } from "@/lib/actions/reservas";
import ProjectDetailLayout from "@/components/dashboard/proyectos/project-detail-layout";
import { TrendingUp, BarChart3, Building2, DollarSign } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

const InventarioServer = dynamic(() => import("@/components/dashboard/proyectos/inventario-server"), { ssr: false });
const ReservasTab = dynamic(() => import("@/components/reservas/ReservasTab"), { ssr: false });
const EtapasManager = dynamic(() => import("@/components/dashboard/proyectos/etapas-manager"), { ssr: false });
const InversionPanel = dynamic(() => import("@/components/dashboard/proyectos/inversion-panel"), { ssr: false });
const DocumentosManager = dynamic(() => import("@/components/dashboard/proyectos/documentos-manager"), { ssr: false });
const PlanosTab = dynamic(() => import("@/components/blueprint/PlanosTab"), { ssr: false });
const Tour360Viewer = dynamic(() => import("@/components/tour360/Tour360Viewer"), { ssr: false });
const PagosManager = dynamic(() => import("@/components/dashboard/proyectos/pagos-manager"), { ssr: false });

const MasterplanMap = dynamic(() => import("@/components/masterplan/masterplan-map"), { ssr: false });
const MasterplanViewer = dynamic(() => import("@/components/masterplan/masterplan-viewer"), { ssr: false });

interface PageProps {
    params: { id: string };
    searchParams: { tab?: string };
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    const activeTab = searchParams.tab || "info";
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "INVITADO";

    const [proyectoRaw, statsGrouped] = await Promise.all([
        prisma.proyecto.findUnique({
            where: { id: params.id },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: true
                            }
                        }
                    },
                    orderBy: { orden: "asc" }
                },
                pagos: {
                    orderBy: { createdAt: "desc" },
                    include: { usuario: { select: { nombre: true } } }
                },
                tours: {
                    include: { scenes: { include: { hotspots: true } } }
                },
                documentacion: true,
                inversiones: { include: { inversor: true } },
                hitosEscrow: true
            }
        }),
        prisma.unidad.groupBy({
            by: ['estado'],
            where: { manzana: { etapa: { proyectoId: params.id } } },
            _count: true,
            _sum: { precio: true }
        })
    ]);

    if (!proyectoRaw) return <div className="p-20 text-center">Proyecto no encontrado</div>;

    const proyecto = proyectoRaw as any;

    // Process stats
    let total = 0, disponibles = 0, reservadas = 0, vendidas = 0, valorTotal = 0, valorVendido = 0;
    statsGrouped.forEach(group => {
        const count = group._count;
        const sum = Number(group._sum.precio || 0);
        total += count;
        valorTotal += sum;
        if (group.estado === "DISPONIBLE") disponibles += count;
        if (group.estado === "RESERVADA") reservadas += count;
        if (group.estado === "VENDIDA") { vendidas += count; valorVendido += sum; }
    });

    const stats = {
        total, disponibles, reservadas, vendidas, 
        valorTotal, valorVendido, 
        pctVendido: total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0
    };

    const reservasRes = await getReservasByProyecto(params.id);
    const reservasProyecto = reservasRes.success ? (reservasRes.data || []) : [];

    return (
        <ProjectDetailLayout
            proyecto={proyecto}
            userRole={userRole}
            activeTab={activeTab}
            stats={stats}
        >
            {activeTab === "info" && (
                <div className="glass-card p-6 min-h-[400px]">
                    <h2 className="text-lg font-bold mb-4">Información General</h2>
                    <p className="text-slate-400 leading-relaxed">{proyecto.descripcion || "Sin descripción disponible."}</p>
                </div>
            )}

            {activeTab === "docs" && (
                <DocumentosManager
                    proyectoId={proyecto.id}
                    documentos={proyecto.documentacion || []}
                    userRole={userRole}
                />
            )}

            {activeTab === "etapas" && <EtapasManager proyectoId={proyecto.id} etapas={proyecto.etapas} />}

            {activeTab === "inventario" && <InventarioServer proyectoId={proyecto.id} />}

            {activeTab === "mapa" && (
                <MasterplanMap
                    proyectoId={proyecto.id}
                    modo="admin"
                    centerLat={proyecto.mapCenterLat || -33.0943}
                    centerLng={proyecto.mapCenterLng || -60.5475}
                    initialUnits={proyecto.etapas.flatMap((etapa: any) =>
                        etapa.manzanas.flatMap((manzana: any) =>
                            manzana.unidades.map((u: any) => ({ ...u, etapaNombre: etapa.nombre, manzanaNombre: manzana.nombre }))
                        )
                    )}
                />
            )}

            {activeTab === "masterplan" && <MasterplanViewer proyectoId={proyecto.id} modo="admin" />}

            {activeTab === "tour360" && (
                <Tour360Viewer
                    proyectoId={proyecto.id}
                    tourId={proyecto.tours?.[0]?.id}
                    unidades={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) => m.unidades))}
                    isAdmin={true}
                />
            )}

            {activeTab === "inversion" && (
                <InversionPanel
                    proyectoId={proyecto.id}
                    proyectoNombre={proyecto.nombre}
                    invertible={proyecto.invertible}
                    m2Vendidos={Number(proyecto.m2VendidosInversores || 0)}
                    metaM2={Number(proyecto.metaM2Objetivo || 0)}
                    precioM2={Number(proyecto.precioM2Inversor || 0)}
                    fechaLimite={proyecto.fechaLimiteFondeo}
                    hitos={proyecto.hitosEscrow || []}
                    inversiones={proyecto.inversiones || []}
                    userRole={userRole}
                />
            )}

            {activeTab === "reservas" && (
                <ReservasTab
                    proyectoId={proyecto.id}
                    initialReservas={reservasProyecto as any}
                    userRole={userRole}
                />
            )}

            {activeTab === "pagos" && <PagosManager pagos={proyecto.pagos || []} userRole={userRole} proyectoId={proyecto.id} />}

            {activeTab === "planos" && (
                <PlanosTab
                    unidades={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) =>
                        m.unidades.map((u: any) => ({ ...u, manzanaNombre: m.nombre, manzanaId: m.id }))
                    ))}
                    proyectoId={proyecto.id}
                    tour360Url={proyecto.tour360Url}
                    centerLat={proyecto.mapCenterLat || -31.4532}
                    centerLng={proyecto.mapCenterLng || -64.4823}
                />
            )}

            {activeTab === "metricas" && (() => {
                const roiPct = valorTotal > 0 ? ((valorVendido / valorTotal) * 100).toFixed(1) : "0.0";
                const createdMs = proyecto.createdAt ? new Date(proyecto.createdAt).getTime() : Date.now();
                const monthsElapsed = Math.max(1, Math.round((Date.now() - createdMs) / (1000 * 60 * 60 * 24 * 30)));
                const velocidad = (vendidas / monthsElapsed).toFixed(1);
                return (
                    <div className="glass-card p-6 space-y-6">
                        <h2 className="text-lg font-bold">Métricas del Proyecto</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { label: "ROI Realizado", val: `${roiPct}%`, icon: TrendingUp, color: "text-brand-orange" },
                                { label: "Velocidad de Venta", val: `${velocidad} u/mes`, icon: BarChart3, color: "text-emerald-500" },
                                { label: "Stock Disponible", val: `${100 - stats.pctVendido}%`, icon: Building2, color: "text-blue-400" },
                                { label: "Reservas Activas", val: reservasProyecto.length, icon: DollarSign, color: "text-amber-500" }
                            ].map(m => (
                                <div key={m.label} className="p-4 bg-slate-900/50 border border-white/5 rounded-xl flex items-center gap-4">
                                    <m.icon className={cn("w-8 h-8 shrink-0", m.color)} />
                                    <div>
                                        <p className="text-xs text-slate-500">{m.label}</p>
                                        <p className="text-2xl font-black text-white">{m.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </ProjectDetailLayout>
    );
}
