import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dynamic from "next/dynamic";
import ProjectDetailLayout from "@/components/dashboard/proyectos/project-detail-layout";

const InventarioServer = dynamic(() => import("@/components/dashboard/proyectos/inventario-server"), { ssr: false });
const EtapasManager = dynamic(() => import("@/components/dashboard/proyectos/etapas-manager"), { ssr: false });
const DocumentosManager = dynamic(() => import("@/components/dashboard/proyectos/documentos-manager"), { ssr: false });
const PagosManager = dynamic(() => import("@/components/dashboard/proyectos/pagos-manager"), { ssr: false });
const MasterplanMap = dynamic(() => import("@/components/masterplan/masterplan-map"), { ssr: false });
const MasterplanViewer = dynamic(() => import("@/components/masterplan/masterplan-viewer"), { ssr: false });
const Tour360Viewer = dynamic(() => import("@/components/tour360/Tour360Viewer"), { ssr: false });

interface PageProps {
    params: { id: string };
    searchParams: { tab?: string };
}

export default async function ProyectoDetailPage({ params, searchParams }: PageProps) {
    const activeTab = searchParams.tab || "info";
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || "INVITADO";

    const proyectoRaw = await prisma.proyecto.findUnique({
        where: {
            id: params.id,
            creadoPorId: session?.user?.id
        } as any,
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
            pagos: true,
            documentacion: true,
            tours: true,
        }
    });

    if (!proyectoRaw) return <div className="p-20 text-center">Proyecto no encontrado o no tienes acceso</div>;

    const proyecto = proyectoRaw as any;

    // Process stats
    let total = 0, disponibles = 0, reservadas = 0, vendidas = 0, valorTotal = 0, valorVendido = 0;
    proyecto.etapas.forEach((etapa: any) => {
        etapa.manzanas.forEach((manzana: any) => {
            manzana.unidades.forEach((u: any) => {
                total++;
                if (u.estado === "DISPONIBLE") disponibles++;
                if (u.estado === "RESERVADA") reservadas++;
                if (u.estado === "VENDIDA") vendidas++;
                valorTotal += u.precio || 0;
                if (u.estado === "VENDIDA") valorVendido += u.precio || 0;
            });
        });
    });

    const stats = {
        total, disponibles, reservadas, vendidas,
        valorTotal, valorVendido,
        pctVendido: total > 0 ? Math.round(((vendidas + reservadas) / total) * 100) : 0
    };

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
                    initialUnits={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) => m.unidades))}
                />
            )}

            {activeTab === "masterplan" && <MasterplanViewer proyectoId={proyecto.id} modo="admin" />}

            {activeTab === "tour360" && (
                <Tour360Viewer
                    proyectoId={proyecto.id}
                    tourId={proyecto.tours?.[0]?.id}
                    unidades={proyecto.etapas.flatMap((e: any) => e.manzanas.flatMap((m: any) => m.unidades))}
                    isAdmin={userRole === "ADMIN" || userRole === "DESARROLLADOR"}
                />
            )}

            {activeTab === "pagos" && <PagosManager pagos={proyecto.pagos || []} userRole={userRole} proyectoId={proyecto.id} />}
            
            {activeTab === "metricas" && (
                <div className="glass-card p-6">
                    <h2 className="text-lg font-bold mb-4">Métricas de Desarrollador</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl">
                            <p className="text-xs text-slate-500">Unidades Vendidas/Reservadas</p>
                            <p className="text-2xl font-black text-white">{vendidas + reservadas} / {total}</p>
                        </div>
                        <div className="p-4 bg-slate-900/50 border border-white/5 rounded-xl">
                            <p className="text-xs text-slate-500">Porcentaje de Avance</p>
                            <p className="text-2xl font-black text-white">{stats.pctVendido}%</p>
                        </div>
                    </div>
                </div>
            )}
        </ProjectDetailLayout>
    );
}
