import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { prisma } from "@/lib/db";
import TourViewer, { Scene } from "@/components/tour360/tour-viewer";

async function getProject(slug: string) {
    let project = await prisma.proyecto.findUnique({
        where: { slug },
        include: { tours: true }
    });

    if (!project && slug.length === 25) {
        project = await prisma.proyecto.findUnique({
            where: { id: slug },
            include: { tours: true }
        });
    }
    return project;
}

export const metadata: Metadata = {
    title: "Tour Virtual 360° | Seventoop",
};

export default async function PublicTour360Page({ params }: { params: { slug: string } }) {
    const project = await getProject(params.slug);

    if (!project || !project.tours || project.tours.length === 0) {
        notFound();
    }

    const defaultTour = project.tours[0];
    const scenes = (defaultTour.escenas as unknown) as Scene[];


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
                        <p className="text-xs text-slate-400">Tour Virtual 360°</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (navigator.share) {
                                navigator.share({
                                    title: `Tour 360° de ${project.nombre}`,
                                    url: window.location.href
                                });
                            }
                        }}
                        className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all flex items-center gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Compartir
                    </button>
                    <Link
                        href={`/proyectos/${params.slug}#contacto`}
                        className="px-4 py-2 rounded-lg gradient-brand text-white text-sm font-semibold shadow-glow"
                    >
                        Consultar
                    </Link>
                </div>
            </div>

            <div className="flex-1 relative">
                <TourViewer
                    scenes={scenes}
                    className="w-full h-full rounded-none"
                    autoRotate={true}
                />
            </div>
        </div>
    );
}
