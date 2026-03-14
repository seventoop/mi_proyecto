"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Fetches all available LogicToop templates.
 */
export async function getTemplates() {
    try {
        return await (db as any).logicToopTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
    }
}

import { checkOrgLimits } from "@/lib/logictoop/governance";

/**
 * Installs a template for a specific organization.
 * Creates a new LogicToopFlow from the template configuration.
 */
export async function installTemplate(templateId: string, orgId: string) {
    try {
        const limitCheck = await checkOrgLimits(orgId, "INSTALL_TEMPLATE");
        if (!limitCheck.allowed) throw new Error(limitCheck.reason);

        const template = await (db as any).logicToopTemplate.findUnique({
            where: { id: templateId }
        });

        if (!template) throw new Error("Template no encontrado.");

        const newFlow = await (db as any).logicToopFlow.create({
            data: {
                orgId,
                nombre: `${template.nombre} (Instalado)`,
                descripcion: template.descripcion || `Instalado desde plantilla: ${template.nombre}`,
                triggerType: template.triggerType,
                actions: template.flowConfig as any,
                status: "DRAFT",
                activo: false // Start inactive to let user review
            }
        });

        revalidatePath("/dashboard/admin/logictoop");

        return { success: true, flowId: newFlow.id };
    } catch (error: any) {
        console.error("Error installing template:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Utility to seed initial marketplace templates.
 */
export async function seedInitialTemplates() {
    try {
        const templates = [
            {
                nombre: "Captura y Calificación de Leads",
                descripcion: "Automatiza la respuesta inicial y califica al lead usando IA para scoring inmediato.",
                category: "Lead Automation",
                triggerType: "NEW_LEAD",
                flowConfig: [
                    { id: "1", type: "SEND_WHATSAPP", label: "Saludo WhatsApp", config: { message: "Hola {{lead.nombre}}, gracias por tu interés en {{lead.proyecto}}. ¿En qué podemos ayudarte?" } },
                    { id: "2", type: "AI_SCORE_LEAD", label: "Scoring IA", config: { model: "gpt-4o-mini" } },
                    { id: "3", type: "NOTIFY_INTERNAL", label: "Notificar Vendedor", config: { message: "Nuevo lead calificado con score {{ai.score}}." } }
                ]
            },
            {
                nombre: "Seguimiento Inteligente (Agente)",
                descripcion: "Un agente autónomo gestiona el seguimiento de leads fríos para reactivarlos.",
                category: "Follow-up Automation",
                triggerType: "NEW_LEAD",
                flowConfig: [
                    { id: "1", type: "WAIT", label: "Esperar 2 días", config: { durationDays: 2 } },
                    { id: "2", type: "AI_AGENT_FOLLOWUP", label: "Agente Seguimiento", config: { instructions: "Reactiva al lead cordialmente preguntando por su interés pendiente." } }
                ]
            },
            {
                nombre: "Ruteo Avanzado de Inversores",
                descripcion: "Analiza el perfil del lead y lo rutea automáticamente al equipo de inversores si el presupuesto es alto.",
                category: "Sales Automation",
                triggerType: "NEW_LEAD",
                flowConfig: [
                    { id: "1", type: "AI_CLASSIFY_LEAD", label: "Clasificar Perfil", config: { categories: "Inversor, FinalUser, Soporte" } },
                    { id: "2", type: "ASSIGN_LEAD", label: "Asignar a Inversiones", config: { reason: "Lead identificado como inversor de alto potencial." } }
                ]
            }
        ];

        for (const t of templates) {
            await (db as any).logicToopTemplate.upsert({
                where: { id: `seed-${t.nombre.toLowerCase().replace(/\s+/g, '-')}` },
                update: { ...t },
                create: { 
                    id: `seed-${t.nombre.toLowerCase().replace(/\s+/g, '-')}`,
                    ...t 
                }
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error seeding templates:", error);
        return { success: false, error: error.message };
    }
}
