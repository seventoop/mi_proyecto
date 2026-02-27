import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const leadSchema = z.object({
    nombre: z.string().min(2, "El nombre es requerido"),
    email: z.string().email("Email inválido"),
    telefono: z.string().min(6, "Teléfono inválido"),
    mensaje: z.string().optional(),
    proyectoId: z.string().optional(),
    origen: z.string().optional().default("WEB"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = leadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: validation.error.format() },
                { status: 400 }
            );
        }

        const { nombre, email, telefono, mensaje, proyectoId, origen } = validation.data;

        // Check if lead exists by email
        let lead = await db.lead.findFirst({
            where: { email },
        });

        if (lead) {
            // Update existing lead with new interaction/project
            lead = await db.lead.update({
                where: { id: lead.id },
                data: {
                    telefono, // Update phone if changed
                    // proyectosInteres: proyectoId ? { connect: { id: proyectoId } } : undefined,
                    // We could add a "Note" or "Interaction" here
                },
            });
        } else {
            // Create new lead
            // Auto-assign to a salesperson (round-robin or random for now)
            // For MVP, just pick the first available user or admin
            // NOTE: In a real app we'd have a role 'SALES'
            const vendedor = await db.user.findFirst();

            lead = await db.lead.create({
                data: {
                    nombre,
                    email,
                    telefono,
                    origen,
                    estado: "NUEVO",
                    asignadoAId: vendedor?.id,
                    // proyectosInteres: proyectoId ? { connect: { id: proyectoId } } : undefined,
                },
            });
        }

        // TODO: Send email notification to sales rep
        // TODO: Send confirmation email to lead

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: "Error interno al procesar la solicitud" },
            { status: 500 }
        );
    }
}
