"use server";

import OpenAI from "openai";
import prisma from "@/lib/db";
import { getSystemConfig } from "./configuration";
import { z } from "zod";
import { idSchema } from "@/lib/validations";

// ─── Schemas ───

const leadMessageSchema = z.object({
    telefono: z.string().min(5, "Teléfono demasiado corto"),
    mensaje: z.string().min(1, "Mensaje requerido"),
    nombre: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    proyectoId: idSchema.optional(),
});

const joinCommunitySchema = z.object({
    nombre: z.string().min(2, "Nombre requerido"),
    telefono: z.string().min(5, "Teléfono requerido"),
});

const improveDescriptionSchema = z.object({
    descripcionActual: z.string().min(1, "Descripción actual requerida"),
    ubicacion: z.string().min(1, "Ubicación requerida"),
    tipo: z.string().min(1, "Tipo requerido"),
});

/**
 * Generates a suggestion for the salesperson (Copilot Mode)
 */
export async function getAICopilotSuggestion(leadId: string) {
    try {
        const idParsed = idSchema.safeParse(leadId);
        if (!idParsed.success) return { success: false, error: "ID de lead inválido" };

        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                proyecto: true,
                mensajes: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        });

        if (!lead || !lead.proyecto) {
            return { success: false, error: "Lead o Proyecto no encontrado" };
        }

        const configRes = await getSystemConfig("OPENAI_API_KEY");
        const apiKey = configRes.value || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return { success: false, error: "OpenAI API Key no configurada" };
        }

        const openai = new OpenAI({ apiKey });

        const systemPrompt = lead.proyecto.aiSystemPrompt || "Eres un asistente de ventas inmobiliarias experto. Tu objetivo es ayudar al vendedor a responder consultas de leads de manera profesional y efectiva.";
        const knowledgeBase = lead.proyecto.aiKnowledgeBase || "No hay información específica del proyecto disponible.";

        // Prepare History
        const historyText = lead.mensajes
            .reverse()
            .map(m => `${m.role === 'user' ? 'Lead' : 'Vendedor'}: ${m.content}`)
            .join('\n');

        const prompt = `
Contexto del Proyecto:
${knowledgeBase}

Historial de conversación:
${historyText}

Datos del Lead:
Nombre: ${lead.nombre}
Email: ${lead.email}
Estado actual: ${lead.estado}
Última Consulta: ${lead.mensaje || "Interesado en el proyecto"}

Por favor, genera una sugerencia de respuesta de WhatsApp de máximo 2 párrafos. 
Debe ser amable, persuasiva y terminar con una pregunta para fomentar la interacción.
Usa el nombre del lead para personalizar.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        const suggestion = response.choices[0]?.message?.content || "No se pudo generar una sugerencia.";
        return { success: true, data: suggestion };
    } catch (error: any) {
        console.error("Error generating AI suggestion:", error);
        return { success: false, error: error.message || "Error al generar sugerencia de IA" };
    }
}

/**
 * Processes an incoming message from WhatsApp (Pilot Mode / Auto-Qualification)
 */
export async function processIncomingLeadMessage(input: unknown) {
    try {
        const parsed = leadMessageSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        const data = parsed.data;

        // 1. Find or Create Lead
        let lead = await prisma.lead.findFirst({
            where: { telefono: data.telefono },
            include: { proyecto: true }
        });

        if (!lead) {
            if (data.mensaje.trim().length < 4) {
                return { success: false, error: "Mensaje demasiado corto" };
            }

            lead = await (prisma.lead.create({
                data: {
                    telefono: data.telefono,
                    nombre: data.nombre || "Nuevo Lead WhatsApp",
                    email: data.email || null,
                    mensaje: data.mensaje,
                    proyectoId: data.proyectoId || null,
                    origen: "WHATSAPP",
                    canalOrigen: "WHATSAPP",
                    automationStatus: "PILOT" as any
                } as any,
                include: { proyecto: true }
            }) as any);

            // Audit Log
            await (prisma.auditLog.create({
                data: {
                    userId: "system",
                    action: "LEAD_INBOUND_WEBHOOK",
                    entity: "Lead",
                    entityId: (lead as any).id,
                    details: JSON.stringify({ canal: "WHATSAPP", status: "NEW" })
                }
            }) as any);
        } else {
            const updateData: any = { mensaje: data.mensaje };

            // Mark as CONTACTADO if it was NEW
            if (lead.estado === "NUEVO") {
                updateData.estado = "CONTACTADO";
            }

            await (prisma.lead.update({
                where: { id: lead.id },
                data: updateData
            }) as any);
        }

        if (!lead) return { success: false, error: "No se pudo obtener el lead" };

        // 2. Store Incoming Message
        await prisma.leadMessage.create({
            data: {
                leadId: lead.id,
                role: 'user',
                content: data.mensaje
            }
        });

        // 3. Determine if we should auto-respond (Pilot Mode)
        const globalAutomationRes = await getSystemConfig("DEFAULT_AUTOMATION_LEVEL");
        const isPilotGlobal = globalAutomationRes.value === "PILOT";
        const isPilotLead = (lead as any).automationStatus === "PILOT";

        if (!isPilotGlobal && !isPilotLead) {
            return { success: true, message: "Modo Manual/Copilot: Registrado sin auto-respuesta.", leadId: lead?.id };
        }

        // --- SAFETY CHECK ---
        if (!lead) return { success: false, error: "Error critico: Lead no encontrado tras creacion" };

        // 4. Fetch Recent History for Context
        const history = await prisma.leadMessage.findMany({
            where: { leadId: (lead as any).id },
            orderBy: { createdAt: 'desc' },
            take: 6
        });

        // 5. AI Analysis & Response Generation
        const configRes = await getSystemConfig("OPENAI_API_KEY");
        const apiKey = configRes.value || process.env.OPENAI_API_KEY;
        if (!apiKey) return { success: false, error: "API Key missing" };

        const openai = new OpenAI({ apiKey });
        const kb = (lead as any).proyecto?.aiKnowledgeBase || "Información general de ventas.";
        const systemPrompt = (lead as any).proyecto?.aiSystemPrompt || "Asistente inteligente de ventas inmobiliarias.";

        const historyText = history
            .reverse()
            .map(m => `${m.role === 'user' ? 'Interesado' : 'Asistente'}: ${m.content}`)
            .join('\n');

        const analysisPrompt = `
Eres un asistente de ventas experto. Analiza el historial y el nuevo mensaje para responder inteligentemente.

Contexto Proyecto:
${kb}

Historial Reciente:
${historyText}

Nuevo Mensaje: "${data.mensaje}"

Instrucciones:
1. Si no hay contexto de un proyecto específico, pregunta amablemente qué desarrollo le interesa.
2. Si el lead muestra interés alto, invítalo a la comunidad VIP.
3. Responde en formato JSON.

JSON Schema:
{
 "response": "string (la respuesta para el cliente)",
 "score": number (0-100),
 "summary": "string (resumen de la necesidad actual)",
 "status": "string (NUEVO, CONTACTADO, CALIFICADO, PERDIDO)",
 "inviteVip": boolean
}
        `;

        const aiRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: analysisPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(aiRes.choices[0].message.content || "{}");

        // 6. Update Lead with AI insights
        await prisma.lead.update({
            where: { id: lead!.id },
            data: {
                aiQualificationScore: result.score,
                lastAiSummary: result.summary,
                estado: result.status,
                ultimoContacto: new Date()
            }
        });

        // 7. Handle VIP Invitation & Community
        if (result.inviteVip && (lead as any).communityType !== 'VIP') {
            const vipInvite = "\n\n*Invitación Exclusiva:* He notado que eres un inversor serio. Te invito a nuestra Comunidad VIP donde compartimos oportunidades de pozo únicas. ¿Te gustaría sumarte?";
            result.response += vipInvite;

            await prisma.lead.update({
                where: { id: lead!.id },
                data: { communityType: 'VIP' as any }
            });
        }

        // 8. Store & Send WhatsApp Message
        if (result.response && lead) {
            await prisma.leadMessage.create({
                data: {
                    leadId: lead.id,
                    role: 'assistant',
                    content: result.response
                }
            });
            await sendWhatsAppMessage(data.telefono, result.response);
        }

        return { success: true, data: result, leadId: lead?.id };
    } catch (error: any) {
        console.error("Error in AI Pilot processing:", error);
        return { success: false, error: error.message };
    }
}

async function sendWhatsAppMessage(to: string, message: string) {
    try {
        const providerConfig = await getSystemConfig("WHATSAPP_PROVIDER_KEY");
        const apiKey = providerConfig.value;
        if (!apiKey) return;
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error);
    }
}

export async function joinOpenCommunity(input: unknown) {
    try {
        const parsed = joinCommunitySchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        const formData = parsed.data;

        let lead = await prisma.lead.findFirst({
            where: { telefono: formData.telefono }
        });

        if (lead) {
            lead = await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    nombre: formData.nombre,
                    communityType: 'OPEN' as any,
                    origen: 'LANDING_COMMUNITY'
                } as any
            });
        } else {
            lead = await prisma.lead.create({
                data: {
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    communityType: 'OPEN' as any,
                    origen: 'LANDING_COMMUNITY',
                    automationStatus: 'PILOT' as any
                } as any
            });
        }

        const welcomeMsg = `¡Hola ${formData.nombre}! Bienvenido a la Comunidad Seventoop 🌿. Aquí recibirás noticias exclusivas sobre desarrollo sustentable y oportunidades de inversión antes que nadie.`;

        await prisma.leadMessage.create({
            data: {
                leadId: lead.id,
                role: 'assistant',
                content: welcomeMsg
            }
        });

        await sendWhatsAppMessage(formData.telefono, welcomeMsg);
        return { success: true, leadId: lead.id };
    } catch (error: any) {
        console.error("Error joining community:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Professionalizes a project description using AI
 */
export async function improveProjectDescription(input: unknown) {
    try {
        const parsed = improveDescriptionSchema.safeParse(input);
        if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos" };
        const data = parsed.data;

        const configRes = await getSystemConfig("OPENAI_API_KEY");
        const apiKey = configRes.value || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return { success: false, error: "OpenAI API Key no configurada" };
        }

        const openai = new OpenAI({ apiKey });

        const prompt = `
            Eres un redactor creativo experto en marketing inmobiliario de lujo y profesional.
            Tu tarea es mejorar la descripción de un proyecto inmobiliario para que sea persuasiva, elegante y profesional.

            DATOS DEL PROYECTO:
            - Ubicación: ${data.ubicacion}
            - Tipo de Proyecto: ${data.tipo}
            - Notas/Descripción base: ${data.descripcionActual}

            REGLAS CRÍTICAS:
            1. No inventes datos técnicos que no estén presentes.
            2. Enfócate en las ventajas competitivas, el público objetivo y un tono profesional.
            3. Estructura la respuesta en un JSON con 3 campos:
               - "improvedText": La descripción completa mejorada (máximo 250 palabras).
               - "shortSummary": Un resumen ejecutivo de 1 párrafo.
               - "highlights": Una lista de 3 a 5 puntos destacados (bullet points).

            Responde ÚNICAMENTE con el objeto JSON.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Asistente experto en marketing inmobiliario." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");

        return {
            success: true,
            data: {
                improvedText: result.improvedText,
                shortSummary: result.shortSummary,
                highlights: result.highlights
            }
        };
    } catch (error: any) {
        console.error("Error improving project description:", error);
        return { success: false, error: "Error al mejorar la descripción con IA" };
    }
}
