import { z } from "zod";
import { slugSchema, idSchema } from "./common";

export const proyectoCreateSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100),
    slug: slugSchema.optional(),
    descripcion: z.string().max(2000).optional(),
    ubicacion: z.string().max(200).optional(),
    estado: z.string().optional(),
    tipo: z.string().optional(),
    imagenPortada: z.string().url("URL de imagen inválida").optional().or(z.literal("")),
    invertible: z.boolean().optional(),
    precioM2Inversor: z.number().positive().optional(),
    precioM2Mercado: z.number().positive().optional(),
    metaM2Objetivo: z.number().positive().optional(),
    fechaLimiteFondeo: z.date().optional().or(z.string().transform(v => new Date(v))).optional(),
    mapCenterLat: z.number().optional(),
    mapCenterLng: z.number().optional(),
    mapZoom: z.number().int().optional(),
    aiKnowledgeBase: z.string().optional(),
    aiSystemPrompt: z.string().optional(),
    galeria: z.array(z.string()).optional(),
    documentos: z.array(z.string()).optional(),
});

export const proyectoUpdateSchema = proyectoCreateSchema.partial();

export const uploadDocumentoSchema = z.object({
    proyectoId: z.string().cuid(),
    nombre: z.string().min(1, "Nombre requerido").max(100),
    tipo: z.string().min(1, "Tipo de documento requerido"),
    categoria: z.string().default("GENERAL"),
    url: z.string().url("URL de documento inválida"),
    descripcion: z.string().max(500).optional(),
    visiblePublicamente: z.boolean().default(false),
});

export const etapaCreateSchema = z.object({
    nombre: z.string().min(1),
    estado: z.string().optional().default("PENDIENTE"),
});

export const blueprintSyncSchema = z.object({
    svgContent: z.string(),
    units: z.array(z.object({
        id: idSchema,
        pathData: z.string(),
        center: z.object({
            x: z.number(),
            y: z.number(),
        }).optional().nullable(),
    })),
});

export const overlayUpdateSchema = z.object({
    imageUrl: z.string().url().optional().nullable(),
    bounds: z.array(z.array(z.number())).optional().nullable(),
    rotation: z.number().optional().default(0),
    mapCenter: z.object({
        lat: z.number(),
        lng: z.number(),
        zoom: z.number(),
    }).optional().nullable(),
});
