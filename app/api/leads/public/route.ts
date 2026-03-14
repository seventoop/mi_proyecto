import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validations";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
    // @security-waive: PUBLIC - Capture leads from landing pages
    try {
        // Rate Limiting: Max 10 leads per 10 minutes per IP
        const ip = getClientIp(req);
        const { allowed } = await checkRateLimit(ip, {
            limit: 10,
            windowMs: 10 * 60 * 1000,
            keyPrefix: "public_lead_"
        });

        if (!allowed) {
            return NextResponse.json(
                { error: "Demasiadas solicitudes. Intente de nuevo en 10 minutos." },
                { status: 429 }
            );
        }
        const body = await req.json();
        
        // 🛡️ STRICT VALIDATION
        const validation = leadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos inválidos", details: validation.error.flatten() },
                { status: 400 }
            );
        }

        const data = validation.data;

        // Check if lead exists by email
        let lead = await db.lead.findFirst({
            where: { email: data.email || undefined },
        });

        if (lead) {
            // Update existing lead with new interaction/project
            lead = await db.lead.update({
                where: { id: lead.id },
                data: {
                    telefono: data.telefono || lead.telefono,
                },
            });
        } else {
            // Create in LeadIntake (Quarantine) for safety
            const intake = await db.leadIntake.create({
                data: {
                    source: data.origen || "PUBLIC_FORM",
                    rawPayload: data, // Zod validated data
                    status: "PENDIENTE"
                }
            });
            return NextResponse.json({ success: true, intakeId: intake.id });
        }

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error("Error creating lead:", error);
        return NextResponse.json(
            { error: "Error interno al procesar la solicitud" },
            { status: 500 }
        );
    }
}
