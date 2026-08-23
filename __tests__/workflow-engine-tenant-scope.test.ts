import { beforeEach, describe, expect, it, vi } from "vitest";

const aiLeadScoringMock = vi.fn();
const workflowRunCreateMock = vi.fn();
const workflowFindUniqueMock = vi.fn();
const leadFindFirstMock = vi.fn();
const leadUpdateManyMock = vi.fn();
const workflowRunUpdateMock = vi.fn();
const workflowRunPasoCreateMock = vi.fn();
const workflowRunPasoFindManyMock = vi.fn();

vi.mock("@/lib/actions/ai-lead-scoring", () => ({
    aiLeadScoring: (...args: unknown[]) => aiLeadScoringMock(...args),
}));

vi.mock("@/lib/db", () => ({
    default: {
        workflowRun: {
            create: (...args: unknown[]) => workflowRunCreateMock(...args),
            update: (...args: unknown[]) => workflowRunUpdateMock(...args),
        },
        workflow: {
            findUnique: (...args: unknown[]) => workflowFindUniqueMock(...args),
        },
        lead: {
            findFirst: (...args: unknown[]) => leadFindFirstMock(...args),
            updateMany: (...args: unknown[]) => leadUpdateManyMock(...args),
        },
        workflowRunPaso: {
            create: (...args: unknown[]) => workflowRunPasoCreateMock(...args),
            findMany: (...args: unknown[]) => workflowRunPasoFindManyMock(...args),
        },
    },
}));

import { runWorkflow } from "@/lib/workflow-engine";

const ORG_A = "org-a";
const LEAD_A = "lead-a";
const WORKFLOW_ID = "workflow-a";

function workflowWithNode(tipo: string, config: Record<string, unknown> = {}) {
    return {
        id: WORKFLOW_ID,
        orgId: ORG_A,
        nodos: [{ id: `node-${tipo}`, tipo, orden: 0, config }],
    };
}

function lead(id = LEAD_A) {
    return {
        id,
        orgId: ORG_A,
        nombre: "Lead A",
        email: "lead-a@example.com",
        estado: "NUEVO",
    };
}

describe("runWorkflow tenant scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        workflowRunCreateMock.mockResolvedValue({ id: "run-1" });
        workflowRunUpdateMock.mockResolvedValue({});
        workflowRunPasoCreateMock.mockResolvedValue({});
        workflowRunPasoFindManyMock.mockResolvedValue([
            { id: "paso-1", nodoTipo: "TEST", estado: "OK", ms: 1 },
        ]);
        aiLeadScoringMock.mockResolvedValue(undefined);
        leadUpdateManyMock.mockResolvedValue({ count: 1 });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true }));
    });

    it("permite workflow Org A con Lead Org A", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("UPDATE_LEAD", {
            fields: { estado: "CONTACTADO" },
        }));
        leadFindFirstMock.mockResolvedValue(lead());

        const result = await runWorkflow(WORKFLOW_ID, "MANUAL", LEAD_A);

        expect(result.estado).toBe("SUCCESS");
        expect(leadFindFirstMock).toHaveBeenCalledWith({ where: { id: LEAD_A, orgId: ORG_A } });
        expect(leadUpdateManyMock).toHaveBeenCalledWith({
            where: { id: LEAD_A, orgId: ORG_A },
            data: { estado: "CONTACTADO" },
        });
    });

    it("bloquea workflow Org A con Lead de otra org antes de nodo sensible", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("AI_ACTION"));
        leadFindFirstMock.mockResolvedValue(null);

        await expect(runWorkflow(WORKFLOW_ID, "MANUAL", "lead-b")).rejects.toThrow(
            "Entity not found for workflow organization",
        );
        expect(aiLeadScoringMock).not.toHaveBeenCalled();
        expect(workflowRunPasoCreateMock).not.toHaveBeenCalled();
    });

    it("AI_ACTION no procesa Lead cross-org", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("AI_ACTION"));
        leadFindFirstMock.mockResolvedValue(null);

        await expect(runWorkflow(WORKFLOW_ID, "MANUAL", "lead-b")).rejects.toThrow();

        expect(aiLeadScoringMock).not.toHaveBeenCalled();
    });

    it("UPDATE_LEAD no modifica Lead cross-org", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("UPDATE_LEAD", {
            fields: { estado: "CONTACTADO" },
        }));
        leadFindFirstMock.mockResolvedValue(null);

        await expect(runWorkflow(WORKFLOW_ID, "MANUAL", "lead-b")).rejects.toThrow();

        expect(leadUpdateManyMock).not.toHaveBeenCalled();
    });

    it("CONDITION no lee ni persiste datos cross-org", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("CONDITION", {
            field: "email",
            operator: "contains",
            value: "@example.com",
        }));
        leadFindFirstMock.mockResolvedValue(null);

        await expect(runWorkflow(WORKFLOW_ID, "MANUAL", "lead-b")).rejects.toThrow();

        expect(workflowRunPasoCreateMock).not.toHaveBeenCalled();
    });

    it("WEBHOOK no ejecuta fetch con entidad cross-org", async () => {
        const fetchMock = vi.mocked(fetch);
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("WEBHOOK", {
            url: "https://example.invalid/hook",
        }));
        leadFindFirstMock.mockResolvedValue(null);

        await expect(runWorkflow(WORKFLOW_ID, "MANUAL", "lead-b")).rejects.toThrow();

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("WAIT funciona sin entityId", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("WAIT"));

        const result = await runWorkflow(WORKFLOW_ID, "MANUAL");

        expect(result.estado).toBe("PAUSED");
        expect(leadFindFirstMock).not.toHaveBeenCalled();
        expect(workflowRunPasoCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ nodoTipo: "WAIT", estado: "OK" }),
        }));
    });

    it("nodo desconocido mantiene SKIPPED", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("UNKNOWN_NODE"));

        await runWorkflow(WORKFLOW_ID, "MANUAL");

        expect(workflowRunPasoCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ nodoTipo: "UNKNOWN_NODE", estado: "SKIPPED" }),
        }));
    });

    it("SEND_EMAIL mantiene comportamiento actual SKIPPED", async () => {
        workflowFindUniqueMock.mockResolvedValue(workflowWithNode("SEND_EMAIL"));

        await runWorkflow(WORKFLOW_ID, "MANUAL");

        expect(workflowRunPasoCreateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ nodoTipo: "SEND_EMAIL", estado: "SKIPPED" }),
        }));
    });
});
