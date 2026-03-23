import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getProjectAccess, ProjectPermission } from "@/lib/project-access";
import ProjectPublicWorkspace from "@/components/dashboard/proyectos/project-public-workspace";
import { getProjectShowcasePayload } from "@/lib/project-showcase";
import { resolveProjectIdentifier } from "@/lib/project-slug";

interface PageProps {
    params: Promise<{ id: string }>;
}

function getManagementPath(projectIdOrSlug: string, role: string) {
    if (role === "ADMIN" || role === "SUPERADMIN") {
        return `/dashboard/admin/proyectos/${projectIdOrSlug}`;
    }

    if (role === "DESARROLLADOR" || role === "VENDEDOR") {
        return `/dashboard/developer/proyectos/${projectIdOrSlug}`;
    }

    return null;
}

export default async function ProyectoWorkspacePage({ params }: PageProps) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return <div className="p-20 text-center text-white">No autorizado</div>;
    }

    const resolvedProject = await resolveProjectIdentifier(id);
    if (!resolvedProject) {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-brand-500">
                    Volver a proyectos
                </Link>
            </div>
        );
    }

    let context;
    try {
        context = await getProjectAccess(session.user as any, resolvedProject.id);
    } catch {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-brand-500">
                    Volver a proyectos
                </Link>
            </div>
        );
    }

    const payload = await getProjectShowcasePayload({
        slugOrId: resolvedProject.id,
        includeUnpublished: true,
    });

    if (!payload) {
        return (
            <div className="p-20 text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Proyecto no encontrado</h1>
                <Link href="/dashboard/proyectos" className="mt-4 inline-block text-brand-500">
                    Volver a proyectos
                </Link>
            </div>
        );
    }

    const role = (session.user as any).role as string;
    const canEditContextually = context.can(ProjectPermission.EDITAR_PROYECTO);
    const canConfigure = canEditContextually;
    const preferredSegment = payload.editorSnapshot.slug || payload.editorSnapshot.id;
    const managementPath = getManagementPath(preferredSegment, role);
    const publicPath = `/proyectos/${payload.project.slug}`;

    return (
        <ProjectPublicWorkspace
            project={payload.project}
            editorSnapshot={payload.editorSnapshot}
            publicPath={publicPath}
            managementPath={managementPath}
            canEditContextually={canEditContextually}
            canConfigure={canConfigure}
            roleLabel={role}
        />
    );
}
