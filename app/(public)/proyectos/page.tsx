import { Metadata } from "next";
import { db } from "@/lib/db";
import ProjectsFilter from "@/components/public/projects-filter";

export const metadata: Metadata = {
    title: "Proyectos | SevenToop — Infraestructura para Lanzamientos Inmobiliarios",
    description:
        "Explorá los desarrollos verificados publicados en SevenToop. Masterplan interactivo, tours 360°, reservas y acceso anticipado para cada proyecto.",
};

async function getProjects() {
    try {
        const projects = await db.proyecto.findMany({
            where: {
                deletedAt: null,
                visibilityStatus: "PUBLICADO",
            },
            orderBy: { createdAt: "desc" },
            include: {
                etapas: {
                    include: {
                        manzanas: {
                            include: {
                                unidades: {
                                    select: {
                                        id: true,
                                        precio: true,
                                        moneda: true,
                                        superficie: true,
                                        estado: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return projects.map((p) => {
            const allUnits = p.etapas.flatMap((e) => e.manzanas.flatMap((m) => m.unidades));
            const availableUnits = allUnits.filter((u) => u.estado === "DISPONIBLE");
            const pricedUnits = availableUnits.filter((u) => u.precio && Number(u.precio) > 0);
            const prices = pricedUnits.map((u) => Number(u.precio!));
            const surfaces = allUnits.filter((u) => u.superficie && Number(u.superficie) > 0).map((u) => Number(u.superficie!));

            return {
                id: p.id,
                nombre: p.nombre,
                slug: p.slug,
                descripcion: p.descripcion,
                ubicacion: p.ubicacion,
                estado: p.estado,
                tipo: p.tipo,
                imagenPortada: p.imagenPortada,
                mapCenterLat: p.mapCenterLat,
                mapCenterLng: p.mapCenterLng,
                invertible: p.invertible,
                precioM2Mercado: p.precioM2Mercado ? Number(p.precioM2Mercado) : null,
                totalUnits: allUnits.length,
                availableUnits: availableUnits.length,
                minPrice: prices.length > 0 ? Math.min(...prices) : null,
                maxPrice: prices.length > 0 ? Math.max(...prices) : null,
                avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
                minSurface: surfaces.length > 0 ? Math.min(...surfaces) : null,
                maxSurface: surfaces.length > 0 ? Math.max(...surfaces) : null,
                currency: allUnits.find((u) => u.moneda)?.moneda || "USD",
            };
        });
    } catch (error) {
        return [];
    }
}

export type ProjectListItem = Awaited<ReturnType<typeof getProjects>>[number];

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="bg-[#060a19] min-h-screen pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center max-w-3xl mx-auto space-y-5">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                            {projects.length} proyectos activos
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
                        Explorá{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-amber-400 bg-clip-text text-transparent">
                            Proyectos
                        </span>
                    </h1>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Desarrollos verificados con masterplan interactivo, tours 360° y ficha técnica completa.
                    </p>
                </div>

                <ProjectsFilter projects={projects} />
            </div>
        </div>
    );
}
