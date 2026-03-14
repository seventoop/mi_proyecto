import { z } from "zod";
import { idSchema, currencySchema } from "./common";

export const unidadCreateSchema = z.object({
    manzanaId: idSchema,
    numero: z.string().min(1, "Número de unidad requerido").max(20),
    tipo: z.string().optional().default("LOTE"),
    superficie: z.number().positive("La superficie debe ser positiva"),
    precio: z.number().nonnegative("El precio no puede ser negativo"),
    moneda: currencySchema.optional(),
    estado: z.string().optional(),
    coordenadasMasterplan: z.string().optional(),
    responsableId: idSchema.optional().nullable(),
    esEsquina: z.boolean().optional(),
    orientacion: z.string().optional(),
    financiacion: z.string().optional(),
    tour360Url: z.string().url().optional().or(z.literal("")),
    imagenes: z.string().optional(),
});

export const unidadUpdateSchema = unidadCreateSchema.partial();
