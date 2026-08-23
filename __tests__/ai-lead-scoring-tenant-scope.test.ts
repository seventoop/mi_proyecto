import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messagesCreateMock = vi.fn();
const leadFindFirstMock = vi.fn();
const proyectoFindManyMock = vi.fn();
const leadUpdateManyMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
    default: vi.fn().mockImplementation(function AnthropicMock() {
        return {
            messages: {
                create: (...args: unknown[]) => messagesCreateMock(...args),
            },
        };
    }),
}));

vi.mock("@/lib/db", () => ({
    default: {
        lead: {
            findFirst: (...args: unknown[]) => leadFindFirstMock(...args),
            updateMany: (...args: unknown[]) => leadUpdateManyMock(...args),
        },
        proyecto: {
            findMany: (...args: unknown[]) => proyectoFindManyMock(...args),
        },
    },
}));

import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";

describe("aiLeadScoring tenant scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
        leadFindFirstMock.mockResolvedValue({
            nombre: "Lead A",
            email: "lead-a@example.com",
            origen: "WEB",
            fuente: null,
            campana: null,
            unidadInteres: null,
            presupuesto: null,
            perfilInversor: "MODERADO",
            mensaje: "Quiero invertir",
            proyecto: null,
        });
        proyectoFindManyMock.mockResolvedValue([
            {
                id: "project-a",
                nombre: "Proyecto A",
                precioM2Inversor: 1000,
                metaM2Objetivo: 100,
                estado: "ACTIVO",
                ubicacion: "Buenos Aires",
            },
        ]);
        messagesCreateMock.mockResolvedValue({
            content: [{
                type: "text",
                text: JSON.stringify({
                    score: 72,
                    perfil: "MODERADO",
                    resumen: "Buen lead.",
                    proyectosRecomendados: ["project-a"],
                }),
            }],
        });
        leadUpdateManyMock.mockResolvedValue({ count: 1 });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("consulta Lead y proyectos sólo por la org indicada", async () => {
        await aiLeadScoring("lead-a", "org-a");

        expect(leadFindFirstMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "lead-a", orgId: "org-a" },
        }));
        expect(proyectoFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { orgId: "org-a" },
        }));
        expect(leadUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "lead-a", orgId: "org-a" },
        }));
    });

    it("no consulta proyectos ni actualiza si el Lead no pertenece a esa org", async () => {
        leadFindFirstMock.mockResolvedValueOnce(null);

        await aiLeadScoring("lead-b", "org-a");

        expect(proyectoFindManyMock).not.toHaveBeenCalled();
        expect(messagesCreateMock).not.toHaveBeenCalled();
        expect(leadUpdateManyMock).not.toHaveBeenCalled();
    });
});
