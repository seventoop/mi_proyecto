import { z } from "zod";
import { idSchema } from "./common";

export const reservaCreateSchema = z.object({
    unidadId: idSchema,
    leadId: idSchema.optional().nullable(),
    fechaVencimiento: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    montoSena: z.number().positive("El monto de la seña debe ser positivo").optional().nullable(),
    plazo: z.string().optional(),
    observaciones: z.string().optional().nullable(),
});

export const confirmVentaSchema = z.object({
    reservaId: idSchema,
    precioFinal: z.number().optional(),
});

export const reservaUpdateActionSchema = z.object({
    action: z.enum(["registrarPago", "extender", "cancelar", "convertir"]),
    montoSena: z.number().optional(),
    nuevaFechaVencimiento: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    motivo: z.string().optional(),
});
