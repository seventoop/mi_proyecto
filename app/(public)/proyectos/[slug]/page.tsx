import { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectDetailShowcase from "@/components/public/project-detail-showcase";
import { getProjectShowcasePayload } from "@/lib/project-showcase";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const payload = await getProjectShowcasePayload({ slugOrId: params.slug });
    if (!payload) {
        return { title: "Proyecto no encontrado | Seventoop" };
    }

    const { project } = payload;

    return {
        title: `${project.nombre} | Seventoop`,
        description:
            project.descripcion?.slice(0, 160) ||
            `Conoce ${project.nombre} en ${project.ubicacion || "una ubicacion destacada"}.`,
        openGraph: {
            title: `${project.nombre} | Seventoop`,
            description:
                project.descripcion?.slice(0, 160) ||
                `Conoce ${project.nombre} en ${project.ubicacion || "una ubicacion destacada"}.`,
            images: [{ url: project.imageUrl }],
        },
    };
}

export default async function ProjectLandingPage({ params }: { params: { slug: string } }) {
    const payload = await getProjectShowcasePayload({ slugOrId: params.slug });

    if (!payload) {
        notFound();
    }

    return <ProjectDetailShowcase project={payload.project} />;
}
