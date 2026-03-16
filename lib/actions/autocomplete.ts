"use server";

import prisma from "@/lib/db";
import { requireAuth, orgFilter, handleGuardError } from "@/lib/guards";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const searchSchema = z.string().min(2, "Búsqueda mínima de 2 caracteres").max(100);

// ─── Queries ───

export async function getLeadsAutocomplete(search: string) {
    try {
        // AUTH: Must be authenticated
        const user = await requireAuth();

        const parsed = searchSchema.safeParse(search);
        if (!parsed.success) return { success: true, data: [] };

        // MULTI-TENANT: Scope directly by lead.orgId (preferred over JOIN via proyecto)
        const orgWhere = user.role !== "ADMIN" && user.orgId
            ? { orgId: user.orgId }
            : {};

        const leads = await prisma.lead.findMany({
            where: {
                ...orgWhere,
                OR: [
                    { nombre: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                ]
            },
            select: { id: true, nombre: true, email: true, telefono: true },
            take: 10
        });
        return { success: true, data: leads };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getVendedoresAutocomplete() {
    try {
        // AUTH: Must be authenticated
        const user = await requireAuth();

        // MULTI-TENANT: Only list users in the same org
        const orgWhere = user.role !== "ADMIN" && user.orgId
            ? { orgId: user.orgId }
            : {};

        const users = await prisma.user.findMany({
            where: {
                ...orgWhere,
                rol: { in: ["ADMIN", "VENDEDOR", "DESARROLLADOR"] }
            },
            select: { id: true, nombre: true },
            orderBy: { nombre: "asc" }
        });
        return { success: true, data: users };
    } catch (error) {
        return handleGuardError(error);
    }
}

export async function getUnidadesDisponiblesAutocomplete(proyectoId?: string) {
    try {
        // AUTH: Must be authenticated
        const user = await requireAuth();

        const where: any = { estado: "DISPONIBLE" };

        // MULTI-TENANT: Only units from projects in user's org
        if (user.role !== "ADMIN" && user.orgId) {
            where.manzana = { etapa: { proyecto: { orgId: user.orgId } } };
        }

        if (proyectoId) {
            const pidParsed = idSchema.safeParse(proyectoId);
            if (!pidParsed.success) return { success: false, error: "ID de proyecto inválido", data: [] };
            // Override more specific filter
            where.manzana = { etapa: { proyectoId } };
        }

        const unidades = await prisma.unidad.findMany({
            where,
            include: {
                manzana: {
                    include: {
                        etapa: {
                            include: { proyecto: { select: { nombre: true } } }
                        }
                    }
                }
            },
            take: 20
        });

        const mapped = unidades.map(u => ({
            id: u.id,
            numero: u.numero,
            proyecto: u.manzana.etapa.proyecto.nombre,
            superficie: u.superficie,
            precio: u.precio,
            moneda: u.moneda
        }));

        return { success: true, data: mapped };
    } catch (error) {
        return handleGuardError(error);
    }
}
