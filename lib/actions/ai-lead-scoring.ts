"use server";

import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/db";

interface ScoringResult {
    score: number;
    perfil: "CONSERVADOR" | "MODERADO" | "AGRESIVO";
    resumen: string;
    proyectosRecomendados: string[];
}

export async function aiLeadScoring(leadId: string): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.warn("[aiLeadScoring] ANTHROPIC_API_KEY not configured — skipping");
        return;
    }

    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
            nombre: true,
            email: true,
            origen: true,
            fuente: true,
            campana: true,
            unidadInteres: true,
            presupuesto: true,
            perfilInversor: true,
            mensaje: true,
            proyecto: {
                select: {
                    nombre: true,
                    precioM2Inversor: true,
                    metaM2Objetivo: true,
                    estado: true,
                    ubicacion: true,
                },
            },
        },
    });

    if (!lead) {
        console.warn(`[aiLeadScoring] Lead ${leadId} not found`);
        return;
    }

    const proyectos = await prisma.proyecto.findMany({
        select: {
            id: true,
            nombre: true,
            precioM2Inversor: true,
            metaM2Objetivo: true,
            estado: true,
            ubicacion: true,
        },
    });

    const client = new Anthropic({ apiKey });

    const prompt = `Eres un experto en calificación de leads inmobiliarios para la plataforma Seventoop.
Analiza el siguiente perfil de lead y devuelve un JSON con tu evaluación.

## Lead
- Nombre: ${lead.nombre}
- Email: ${lead.email ?? "No proporcionado"}
- Origen: ${lead.origen}
- Fuente: ${lead.fuente ?? "Desconocida"}
- Campaña: ${lead.campana ?? "Ninguna"}
- Presupuesto declarado: ${lead.presupuesto ? `USD ${lead.presupuesto}` : "No declarado"}
- Perfil inversor actual: ${lead.perfilInversor ?? "No definido"}
- Mensaje inicial: ${lead.mensaje ?? "Sin mensaje"}
- Proyecto de interés: ${lead.proyecto ? `${lead.proyecto.nombre} (${lead.proyecto.ubicacion ?? "N/A"}) — precio m²: ${lead.proyecto.precioM2Inversor ?? "N/A"} USD` : "No especificado"}
- Unidades de interés: ${lead.unidadInteres ?? "Ninguna"}

## Proyectos disponibles
${proyectos.map(p => `- ID: ${p.id} | ${p.nombre} | ${p.ubicacion ?? "N/A"} | USD ${p.precioM2Inversor ?? "N/A"}/m² | Meta: ${p.metaM2Objetivo ?? "N/A"} m² | Estado: ${p.estado}`).join("\n")}

## Instrucciones
Devuelve SOLO un objeto JSON válido (sin markdown, sin texto extra) con esta estructura exacta:
{
  "score": <número entero 0-100, basado en probabilidad de conversión>,
  "perfil": <"CONSERVADOR" | "MODERADO" | "AGRESIVO">,
  "resumen": <2 oraciones sobre el lead y estrategia recomendada>,
  "proyectosRecomendados": [<array de IDs de proyectos más adecuados para este lead>]
}`;

    const response = await client.messages.create({
        model: "claude-sonnet-4-0",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const result: ScoringResult = JSON.parse(text);

    await prisma.lead.update({
        where: { id: leadId },
        data: {
            aiQualificationScore: Math.min(100, Math.max(0, result.score)),
            lastAiSummary: result.resumen,
            perfilInversor: result.perfil,
            automationStatus: "AI_SCORED",
        },
    });
}
