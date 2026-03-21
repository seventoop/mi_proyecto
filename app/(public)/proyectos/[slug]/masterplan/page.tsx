import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import MasterplanViewer from "@/components/masterplan/masterplan-viewer";
import { MasterplanUnit } from "@/lib/masterplan-store";

import { Prisma } from "@prisma/client";

async function getProject(slugOrId: string) {
    const project = await db.proyecto.findFirst({
        where: {
            OR: [
                { slug: slugOrId },
                { id: slugOrId }
            ]
        },
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

    if (!project) return null;

    // Flatten units for the component to use
    const unidades = project.etapas.flatMap(etapa =>
        etapa.manzanas.flatMap(manzana =>
            manzana.unidades.map(unidad => ({
                ...unidad,
                etapa,
                manzana
            }))
        )
    );

    return {
        ...project,
        unidades
    };
}

export const metadata: Metadata = {
    title: "Masterplan Interactivo | Seventoop",
};

export default async function PublicMasterplanPage({ params }: { params: { slug: string } }) {
    const project = await getProject(params.slug);

    if (!project) {
        notFound();
    }

    // Transform DB units to MasterplanUnits
    // Note: We need x, y, path, etc. stored in `masterplanConfig` or similar.
    // For now, if no masterplanConfig exists, the Viewer will generate demo units if we pass empty array.
    // However, if we want real data we need to map it.
    // Since `masterplanConfig` is JSON, let's assume it holds the geometry data keyed by unit number or ID.

    // Simplification for MVP: We pass empty array to let it generate demo units OR passed mapped units if available.
    // Since I haven't implemented the geometry editor yet, I'll rely on the demo generator for visuals, 
    // BUT mapped with real logic if possible.
    // actually, let's just pass [] and let it generate demo units for now to show the UI working, 
    // as I don't have real SVG paths in the DB yet.

    // Better: I'll try to map what I can, but without paths it's useless.
    // So I will fall back to the Demo Generator in the Viewer by passing undefined/empty.
    // Once I have the editor, I'd fetch the paths from `masterplanConfig`.

    const mappedUnits: MasterplanUnit[] = [];
    // If I wanted to map real units:
    /*
    const geometryMap = project.masterplanConfig as Record<string, any> || {};
    mappedUnits = project.unidades.map(u => ({
        id: u.id,
        numero: u.numero,
        tipo: u.tipo,
        estado: u.estado,
        precio: u.precio,
        moneda: u.moneda,
        superficie: u.superficie,
        // ... geometry from map based on unit ID
        path: geometryMap[u.id]?.path || "",
        cx: geometryMap[u.id]?.cx || 0,
        cy: geometryMap[u.id]?.cy || 0,
        // ...
    }));
    */

    return (
        <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden">
            {/* Minimal Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/proyectos/${params.slug}`}
                        className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-white">{project.nombre}</h1>
                        <p className="text-xs text-slate-400">Masterplan Interactivo</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 mr-4">
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>Disponible</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-orange-500"></div>Reservado</div>
                        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-red-500"></div>Vendido</div>
                    </div>
                    <Link
                        href={`/proyectos/${params.slug}#contacto`}
                        className="px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold shadow-glow"
                    >
                        Consultar
                    </Link>
                </div>
            </div>

            <div className="flex-1 relative">
                <MasterplanViewer
                    proyectoId={project.id}
                    modo="public"
                    canEdit={false}
                />
            </div>
        </div>
    );
}
