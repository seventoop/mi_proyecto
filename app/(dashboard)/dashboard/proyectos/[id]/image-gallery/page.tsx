import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProjectGalleryManager from "@/components/dashboard/proyectos/project-gallery-manager";

interface PageProps {
    params: { id: string };
}

export default function ProjectGalleryPage({ params }: PageProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Galería de Imágenes</p>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Administrar biblioteca visual</h1>
                    <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Subí, editá y guardá imágenes en la galería del proyecto. Desde aquí podés mandar imágenes al circuito de Tour 360 cuando estés listo.
                    </p>
                </div>
                <Link
                    href={`/dashboard/proyectos/${params.id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver al proyecto
                </Link>
            </div>

            <ProjectGalleryManager proyectoId={params.id} />
        </div>
    );
}
