import { Metadata } from "next";
import { db } from "@/lib/db";
import ProjectsFilter from "@/components/public/projects-filter";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buildPublicProjectWhere } from "@/lib/public-projects";

export const metadata: Metadata = {
    title: "Desarrollos | SevenToop — Infraestructura para Lanzamientos Inmobiliarios",
    description:
        "Explorá los desarrollos verificados publicados en SevenToop. Masterplan interactivo, tours 360°, reservas y acceso anticipado para cada proyecto.",
};

async function getProjects() {
    try {
        const projects = await db.proyecto.findMany({
            where: buildPublicProjectWhere(),
            orderBy: { createdAt: "desc" },
        });

        const projectsWithPrices = await Promise.all(
            projects.map(async (p) => ({
                ...p,
                _count: { unidades: 0 },
                unidades: [],
            }))
        );

        return projectsWithPrices;
    } catch (error) {
        return [];
    }
}

export default async function ProjectsPage() {
    const projects = await getProjects();

    return (
        <div className="bg-white dark:bg-black min-h-screen pt-24 pb-12">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-16 text-center max-w-3xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Building2 className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            Desarrollos Verificados
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                        Proyectos en{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            SevenToop
                        </span>
                    </h1>
                    <p className="text-foreground/60 text-lg leading-relaxed">
                        Cada desarrollo publicado cuenta con masterplan interactivo, tours 360°,
                        ficha técnica verificada y acceso desde la comunidad.
                    </p>
                </div>

                {/* Filter & Grid */}
                <ProjectsFilter initialProjects={projects} />

                {/* CTA discreto */}
                <div className="mt-20 mb-8 max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-brand-orange/10 via-brand-orange/5 to-transparent border border-brand-orange/20 p-10 md:p-14 text-center space-y-6">
                    <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                        ¿Tenés un desarrollo para lanzar?
                    </h2>
                    <p className="text-foreground/60 text-base leading-relaxed max-w-xl mx-auto">
                        Publicá tu proyecto con infraestructura profesional, visibilidad desde el día uno y comunidad activa.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                        <Link
                            href="/contacto"
                            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-2xl font-black transition-all shadow-lg shadow-brand-orange/20 hover:scale-[1.02] active:scale-95"
                        >
                            Soy Desarrollador
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="/#comunidad"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-brand-orange/20 text-brand-orange hover:bg-brand-orange hover:text-white rounded-2xl font-black transition-all active:scale-95"
                        >
                            Unirme a la Comunidad
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
