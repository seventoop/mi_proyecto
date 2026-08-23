import { beforeEach, describe, expect, it, vi } from "vitest";

const aiLeadScoringMock = vi.fn();
const runWorkflowMock = vi.fn();
const leadCreateMock = vi.fn();
const leadMessageCreateMock = vi.fn();
const auditLogCreateMock = vi.fn();
const oportunidadCreateMock = vi.fn();
const workflowFindManyMock = vi.fn();

vi.mock("@/lib/actions/ai-lead-scoring", () => ({
    aiLeadScoring: (...args: unknown[]) => aiLeadScoringMock(...args),
}));

vi.mock("@/lib/workflow-engine", () => ({
    runWorkflow: (...args: unknown[]) => runWorkflowMock(...args),
}));

vi.mock("@/lib/db", () => ({
    default: {
        lead: {
            create: (...args: unknown[]) => leadCreateMock(...args),
        },
        leadMessage: {
            create: (...args: unknown[]) => leadMessageCreateMock(...args),
        },
        auditLog: {
            create: (...args: unknown[]) => auditLogCreateMock(...args),
        },
        oportunidad: {
            create: (...args: unknown[]) => oportunidadCreateMock(...args),
        },
        workflow: {
            findMany: (...args: unknown[]) => workflowFindManyMock(...args),
        },
    },
    db: {},
}));

vi.mock("@/lib/logictoop/dispatcher", () => ({
    dispatchTrigger: vi.fn().mockResolvedValue(undefined),
}));

import { executeLeadReception } from "@/lib/crm-pipeline";

async function flushAsyncAutomations() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("executeLeadReception workflow tenant dispatch", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        leadCreateMock.mockResolvedValue({ id: "lead-a" });
        leadMessageCreateMock.mockResolvedValue({});
        auditLogCreateMock.mockResolvedValue({});
        oportunidadCreateMock.mockResolvedValue({});
        workflowFindManyMock.mockResolvedValue([{ id: "workflow-a" }]);
        aiLeadScoringMock.mockResolvedValue(undefined);
        runWorkflowMock.mockResolvedValue({ runId: "run-a", estado: "SUCCESS", pasos: [] });
    });

    it("pipeline NEW_LEAD same-org sigue ejecutando workflows de esa org con ese Lead", async () => {
        const result = await executeLeadReception({
            nombre: "Lead A",
            email: "lead-a@example.com",
            orgId: "org-a",
            sourceType: "API_CRM",
        });
        await flushAsyncAutomations();

        expect(result).toEqual({ success: true, leadId: "lead-a", status: "CREATED" });
        expect(workflowFindManyMock).toHaveBeenCalledWith({
            where: { orgId: "org-a", trigger: "NEW_LEAD", activo: true },
            select: { id: true },
        });
        expect(runWorkflowMock).toHaveBeenCalledWith("workflow-a", "NEW_LEAD", "lead-a");
        expect(aiLeadScoringMock).toHaveBeenCalledWith("lead-a", "org-a");
    });
});
