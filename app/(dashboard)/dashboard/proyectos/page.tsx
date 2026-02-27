import { getProyectos } from "@/lib/actions/proyectos";
import ProjectsListClient from "@/components/dashboard/proyectos/projects-list-client";

export default async function ProyectosPage() {
    const res = await getProyectos({ pageSize: 50 }); // Fetch a larger initial batch for the client-side list

    if (!res.success) {
        return <div className="p-10 text-center text-rose-500">Error al cargar proyectos</div>;
    }

    return (
        <ProjectsListClient
            projects={res.data || []}
            metadata={res.metadata}
        />
    );
}

