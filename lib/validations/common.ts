import { z } from "zod";

export const idSchema = z.string().cuid({ message: "ID inválido (formato CUID esperado)" });
export const optionalIdSchema = idSchema.optional().nullable();

export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
});

export const slugSchema = z.string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones");

export const coordinateSchema = z.number().min(-180).max(180);
export const currencySchema = z.enum(["USD", "ARS", "EUR"]).default("USD");
export const emailSchema = z.string().email("Email inválido");
export const phoneSchema = z.string().min(6, "Teléfono demasiado corto").max(30);

export const searchFiltersSchema = z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
});
