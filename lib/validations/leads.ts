import { z } from "zod";
import { emailSchema, optionalIdSchema } from "./common";

export const leadSchema = z.object({
    nombre: z.string().min(2, "Nombre demasiado corto").max(100),
    email: emailSchema.optional().nullable().or(z.literal("")),
    telefono: z.string().max(30).optional().nullable(),
    proyectoId: optionalIdSchema,
    estado: z.string().optional().default("NUEVO"),
    origen: z.string().optional().default("WEB"),
    mensaje: z.string().optional(),
    unidadInteres: z.string().optional(),
    nota: z.string().optional(),
});

export const leadUpdateSchema = leadSchema.partial();

export const leadBulkItemSchema = z.object({
    nombre: z.string().min(1, "Nombre requerido"),
    email: emailSchema.or(z.literal("")),
    telefono: z.string().optional().nullable(),
});
