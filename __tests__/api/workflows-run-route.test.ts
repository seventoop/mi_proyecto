import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAnyRoleMock = vi.fn();
const workflowFindUniqueMock = vi.fn();
const leadFindFirstMock = vi.fn();
const workflowRunFindUniqueMock = vi.fn();
const runWorkflowMock = vi.fn();

vi.mock("@/lib/guards", () => ({
    requireAnyRole: (...args: unknown[]) => requireAnyRoleMock(...args),
}));

vi.mock("@/lib/db", () => ({
    default: {
        workflow: {
            findUnique: (...args: unknown[]) => workflowFindUniqueMock(...args),
        },
        lead: {
            findFirst: (...args: unknown[]) => leadFindFirstMock(...args),
        },
        workflowRun: {
            findUnique: (...args: unknown[]) => workflowRunFindUniqueMock(...args),
        },
    },
}));

vi.mock("@/lib/workflow-engine", () => ({
    runWorkflow: (...args: unknown[]) => runWorkflowMock(...args),
}));

import { POST } from "@/app/api/workflows/[id]/run/route";

function request(entityId?: string) {
    return new Request("http://localhost/api/workflows/workflow-a/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entityId ? { entityId } : {}),
    });
}

describe("POST /api/workflows/[id]/run tenant scope", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireAnyRoleMock.mockResolvedValue({
            id: "user-a",
            role: "DESARROLLADOR",
            orgId: "org-a",
        });
        workflowFindUniqueMock.mockResolvedValue({
            id: "workflow-a",
            orgId: "org-a",
            activo: true,
            nombre: "Workflow A",
        });
        runWorkflowMock.mockResolvedValue({ runId: "run-a" });
        workflowRunFindUniqueMock.mockResolvedValue({ id: "run-a", estado: "SUCCESS", pasos: [] });
    });

    it("rechaza entityId de Lead de otra org antes de runWorkflow", async () => {
        leadFindFirstMock.mockResolvedValue(null);

        const res = await POST(request("lead-b"), { params: { id: "workflow-a" } });

        expect(res.status).toBe(404);
        await expect(res.json()).resolves.toEqual({
            error: "Entidad no encontrada para este workflow",
        });
        expect(leadFindFirstMock).toHaveBeenCalledWith({
            where: { id: "lead-b", orgId: "org-a" },
            select: { id: true },
        });
        expect(runWorkflowMock).not.toHaveBeenCalled();
    });
});
