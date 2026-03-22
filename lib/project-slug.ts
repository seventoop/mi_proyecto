import prisma from "@/lib/db";

export function slugifyProjectName(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

export async function resolveProjectIdentifier(idOrSlug: string) {
    return prisma.proyecto.findFirst({
        where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        },
        select: {
            id: true,
            slug: true,
            nombre: true,
        },
    });
}

export function projectPathSegment(project: { slug?: string | null; id: string }) {
    return project.slug || project.id;
}
