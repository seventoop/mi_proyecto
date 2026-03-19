import { z } from "zod";
import { idSchema } from "./common";

export const updateOportunidadSchema = z.object({
    probabilidad: z.number().int().min(0).max(100).optional(),
    valorEstimado: z.number().positive().optional(),
    fechaCierreEstimada: z.string().optional(),
    proximaAccion: z.string().max(500).optional(),
    etapa: z.enum(["NUEVO", "CONTACTADO", "CALIFICADO", "VISITA", "NEGOCIACION", "RESERVA", "PERDIDO"]).optional(),
});

export const closeOportunidadSchema = z.object({
    unidadId: idSchema,
    montoSena: z.number().positive("El monto de seña debe ser positivo"),
    fechaVencimiento: z.string().optional(),
});

export const updatePipelineSchema = z.object({
  oportunidadId: idSchema,
  nuevaEtapa: z.enum([
    "NUEVO",
    "CONTACTADO",
    "CALIFICADO",
    "VISITA",
    "NEGOCIACION",
    "RESERVA",
    "VENTA",
    "PERDIDO",
  ]),
});

export const createTaskSchema = z.object({
    titulo: z.string().min(1, "El título es obligatorio"),
    descripcion: z.string().optional(),
    fechaVencimiento: z.string().or(z.date()).transform((val) => new Date(val)),
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]).default("MEDIA"),
    leadId: idSchema.optional().nullable(),
    proyectoId: idSchema.optional().nullable(),
});

export const leadAssignmentSchema = z.object({
    leadId: idSchema,
    orgId: idSchema.optional().nullable(),
    asignadoAId: idSchema.optional().nullable(),
    score: z.number().min(0).max(100).optional(),
    estado: z.string().optional(),
});
