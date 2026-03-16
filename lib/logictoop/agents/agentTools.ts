import { AgentToolDefinition, AgentContext } from "./types";
import { db } from "@/lib/db";

/**
 * LogicToop V1 Approved Agent Tools
 * All tools must strictly respect orgId isolation.
 */
export const AGENT_TOOLS: AgentToolDefinition[] = [
    {
        name: "createTask",
        description: "Crea una tarea de seguimiento en el CRM para el lead actual.",
        parameters: {
            type: "object",
            properties: {
                title: { type: "string", description: "Título de la tarea" },
                description: { type: "string", description: "Descripción detallada" },
                dueDate: { type: "string", description: "Fecha de vencimiento (ISO)" }
            },
            required: ["title"]
        },
        handler: async (args, context) => {
            if (!context.leadId) throw new Error("No hay leadId en el contexto.");
            
            const task = await (db as any).tarea.create({
                data: {
                    orgId: context.orgId,
                    leadId: context.leadId,
                    titulo: args.title,
                    descripcion: args.description || "Creada por Agente IA",
                    fechaVencimiento: args.dueDate ? new Date(args.dueDate) : new Date(Date.now() + 86400000),
                    estado: "PENDIENTE"
                }
            });

            return { success: true, taskId: task.id };
        }
    },
    {
        name: "assignLead",
        description: "Asigna el lead a un vendedor específico o lo marca para asignación automática.",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "ID del usuario (opcional)" },
                reason: { type: "string", description: "Razón de la asignación" }
            }
        },
        handler: async (args, context) => {
            if (!context.leadId) throw new Error("No hay leadId.");
            
            await (db as any).lead.update({
                where: { id: context.leadId, orgId: context.orgId },
                data: { 
                    usuarioID: args.userId || null,
                    lastAiSummary: `Reasignado por Agente: ${args.reason || 'Sin razón'}`
                }
            });

            return { success: true, assignedTo: args.userId || "Autodispatch" };
        }
    },
    {
        name: "updateLeadField",
        description: "Actualiza un campo específico del lead (ej: email, presupuesto, interes).",
        parameters: {
            type: "object",
            properties: {
                field: { type: "string", enum: ["email", "presupuesto", "unidadInteres", "perfilInversor"] },
                value: { type: "string" }
            },
            required: ["field", "value"]
        },
        handler: async (args, context) => {
            if (!context.leadId) throw new Error("Falta leadId.");
            
            const data: any = {};
            data[args.field] = args.value;

            await (db as any).lead.update({
                where: { id: context.leadId, orgId: context.orgId },
                data
            });

            return { success: true, field: args.field, value: args.value };
        }
    },
    {
        name: "addLeadNote",
        description: "Agrega una nota interna al historial del lead.",
        parameters: {
            type: "object",
            properties: {
                note: { type: "string", description: "Contenido de la nota" }
            },
            required: ["note"]
        },
        handler: async (args, context) => {
            if (!context.leadId) throw new Error("Falta leadId.");
            
            await (db as any).leadMessage.create({
                data: {
                    leadId: context.leadId,
                    role: "system",
                    content: `[NOTA AGENTE]: ${args.note}`
                }
            });

            return { success: true };
        }
    }
];
