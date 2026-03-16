import { z } from "zod";

/**
 * Common Zod schemas for reuse across the application.
 * Centralizing these ensures consistency in data validation.
 */

// ─── ID SCHEMAS ───

export const idSchema = z.string().cuid({ message: "ID inválido (formato CUID esperado)" });

export const optionalIdSchema = idSchema.optional().nullable();

// ─── PAGINATION SCHEMAS ───

export const paginationSchema = z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
});

// ─── COMMON DATA SCHEMAS ───

export const slugSchema = z.string()
    .min(3, "El slug debe tener al menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones");

export const coordinateSchema = z.number().min(-180).max(180);

export const currencySchema = z.enum(["USD", "ARS", "EUR"]).default("USD");

export const emailSchema = z.string().email("Email inválido");

export const phoneSchema = z.string().min(6, "Teléfono demasiado corto").max(30);

// ─── SEARCH & FILTERS ───

export const searchFiltersSchema = z.object({
    search: z.string().optional(),
    status: z.string().optional(),
    type: z.string().optional(),
});

// ─── RE-EXPORTS FROM SUBDIRECTORY ───

export { proyectoCreateSchema, proyectoUpdateSchema, uploadDocumentoSchema, etapaCreateSchema, blueprintSyncSchema, overlayUpdateSchema } from "@/lib/validations/proyectos";
export { leadSchema, leadUpdateSchema, leadBulkItemSchema } from "@/lib/validations/leads";
export { unidadCreateSchema, unidadUpdateSchema } from "@/lib/validations/unidades";
export { reservaCreateSchema, confirmVentaSchema, reservaUpdateActionSchema } from "@/lib/validations/reservas";
export { updatePipelineSchema, createTaskSchema, leadAssignmentSchema } from "@/lib/validations/crm";
