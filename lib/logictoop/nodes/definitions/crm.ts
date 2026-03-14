import { NodeDefinition } from "../types";
import { db } from "@/lib/db";

export const assignLeadNode: NodeDefinition = {
    type: "ASSIGN_LEAD",
    label: "Asignar Lead",
    category: "CRM",
    icon: "user-plus",
    description: "Asigna un lead a un usuario específico.",
    configSchema: [
        {
            id: "userId",
            label: "Usuario",
            type: "select",
            required: true,
            placeholder: "Seleccionar usuario..."
        }
    ],
    handler: async (config, payload, orgId) => {
        const leadId = payload.leadId;
        const userId = config.userId;

        if (!leadId) throw new Error("Payload no contiene leadId");
        if (!userId) throw new Error("Configuración no contiene userId");

        await db.lead.update({
            where: { id: leadId },
            data: { asignadoAId: userId }
        });

        return { assignedTo: userId };
    }
};

export const createTaskNode: NodeDefinition = {
    type: "CREATE_TASK",
    label: "Crear Tarea",
    category: "CRM",
    icon: "check-square",
    description: "Crea una nueva tarea para un usuario.",
    configSchema: [
        { id: "userId", label: "Usuario", type: "select", required: true },
        { id: "title", label: "Título", type: "text", required: true },
        { id: "description", label: "Descripción", type: "textarea" },
        { id: "daysDiff", label: "Vencimiento (días desde hoy)", type: "number", defaultValue: 1 }
    ],
    handler: async (config, payload, orgId) => {
        const { userId, title, description, daysDiff } = config;

        if (!userId) throw new Error("Configuración no contiene userId");
        if (!title) throw new Error("Configuración no contiene título");

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (daysDiff || 1));

        const task = await db.tarea.create({
            data: {
                titulo: title,
                descripcion: description || "Tarea generada automáticamente por LogicToop",
                fechaVencimiento: dueDate,
                prioridad: config.priority || "MEDIA",
                usuarioId: userId,
                leadId: payload.leadId || null,
                proyectoId: payload.proyectoId || null,
                estado: "PENDIENTE"
            }
        });

        return { taskId: task.id };
    }
};

export const moveLeadStageNode: NodeDefinition = {
    type: "MOVE_LEAD_STAGE",
    label: "Cambiar Etapa",
    category: "CRM",
    icon: "arrow-right-circle",
    description: "Mueve un lead a una etapa diferente del pipeline.",
    configSchema: [
        { id: "stageId", label: "Etapa Destino", type: "select", required: true }
    ],
    handler: async (config, payload, orgId) => {
        const { stageId } = config;
        const leadId = payload.leadId;

        if (!leadId) throw new Error("Payload no contiene leadId");
        if (!stageId) throw new Error("Configuración no contiene stageId");

        const stage = await db.pipelineEtapa.findFirst({
            where: { id: stageId, orgId }
        });
        if (!stage) throw new Error("Etapa no encontrada");

        await db.lead.update({
            where: { id: leadId, orgId },
            data: { etapaId: stageId }
        });

        return { movedTo: stage.nombre };
    }
};
