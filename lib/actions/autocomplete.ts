"use server";

import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getLeadsAutocomplete(search: string) {
    try {
        const leads = await prisma.lead.findMany({
            where: {
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
        return { success: false, data: [] };
    }
}

export async function getVendedoresAutocomplete() {
    try {
        const users = await prisma.user.findMany({
            where: {
                rol: { in: ["ADMIN", "VENDEDOR", "DESARROLLADOR"] }
            },
            select: { id: true, nombre: true },
            orderBy: { nombre: "asc" }
        });
        return { success: true, data: users };
    } catch (error) {
        return { success: false, data: [] };
    }
}

export async function getUnidadesDisponiblesAutocomplete(proyectoId?: string) {
    try {
        const where: any = { estado: "DISPONIBLE" };
        if (proyectoId) {
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
        return { success: false, data: [] };
    }
}
