import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadSchema } from "@/lib/validations";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { executeLeadReception } from "@/lib/crm-pipeline";

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
            // Create in LeadIntake (Quarantine) for safety via the pipeline
            const result = await executeLeadReception({
                nombre: data.nombre,
                email: data.email || null,
                telefono: data.telefono || null,
                proyectoId: data.proyectoId || null,
                origen: data.origen || "PUBLIC_FORM",
                canalOrigen: "WEB",
                mensaje: data.mensaje || undefined,
                notas: data.nota ? JSON.stringify([{ texto: data.nota }]) : "[]",
                unidadInteres: data.unidadInteres || null,
                orgId: null, // Forces quarantine in the pipeline
                sourceType: "PUBLIC_FORM",
                rawPayloadForIntake: data
            });
            
            const resData: any = { success: true };
            if (result.intakeId) resData.intakeId = result.intakeId;
            return NextResponse.json(resData);
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
