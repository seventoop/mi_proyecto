import prisma from "@/lib/db";
import { aiLeadScoring } from "@/lib/actions/ai-lead-scoring";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeConfig {
    continueOnError?: boolean;
    // UPDATE_LEAD
    fields?: Record<string, unknown>;
    // CONDITION
    field?: string;
    operator?: string;
    value?: unknown;
    // WEBHOOK
    url?: string;
    // WAIT — no extra config
}

type WorkflowEntityType = "LEAD";

type WorkflowExecutionEntity = {
    type: WorkflowEntityType;
    id: string;
    orgId: string;
    data: Record<string, unknown>;
};

type WorkflowExecutionContext = {
    workflowId: string;
    workflowOrgId: string;
    trigger: string;
    entity?: WorkflowExecutionEntity;
};

export interface WorkflowResult {
    runId: string;
    estado: string;
    pasos: { id: string; nodoTipo: string; estado: string; ms: number | null }[];
}

// ─── Condition evaluator ──────────────────────────────────────────────────────

function evalCondition(fieldVal: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
        case "eq":       return fieldVal == expected;
        case "neq":      return fieldVal != expected;
        case "gt":       return Number(fieldVal) > Number(expected);
        case "lt":       return Number(fieldVal) < Number(expected);
        case "gte":      return Number(fieldVal) >= Number(expected);
        case "lte":      return Number(fieldVal) <= Number(expected);
        case "contains": return String(fieldVal).toLowerCase().includes(String(expected).toLowerCase());
        case "exists":   return fieldVal !== null && fieldVal !== undefined;
        default:         return true;
    }
}

const ENTITY_NODE_TYPES = new Set(["AI_ACTION", "UPDATE_LEAD", "CONDITION", "WEBHOOK"]);

function workflowNeedsEntity(nodos: { tipo: string }[]): boolean {
    return nodos.some((nodo) => ENTITY_NODE_TYPES.has(nodo.tipo));
}

// ─── Main executor ────────────────────────────────────────────────────────────

export async function runWorkflow(
    workflowId: string,
    trigger: string,
    entityId?: string,
): Promise<WorkflowResult> {
    // Create the run record
    const run = await prisma.workflowRun.create({
        data: { workflowId, trigger, entityId: entityId ?? null, estado: "RUNNING" },
    });

    try {
        const workflow = await prisma.workflow.findUnique({
            where: { id: workflowId },
            include: { nodos: { orderBy: { orden: "asc" } } },
        });

        if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

        let context: WorkflowExecutionContext = {
            workflowId: workflow.id,
            workflowOrgId: workflow.orgId,
            trigger,
        };

        if (entityId && workflowNeedsEntity(workflow.nodos)) {
            const lead = await prisma.lead.findFirst({
                where: { id: entityId, orgId: workflow.orgId },
            });

            if (!lead) {
                throw new Error("Entity not found for workflow organization");
            }

            context = {
                ...context,
                entity: {
                    type: "LEAD",
                    id: lead.id,
                    orgId: lead.orgId!,
                    data: lead as unknown as Record<string, unknown>,
                },
            };
        }

        let running = true;
        let runEstado = "SUCCESS";

        for (const nodo of workflow.nodos) {
            if (!running) {
                // Log skipped pasos for full traceability
                await prisma.workflowRunPaso.create({
                    data: { runId: run.id, nodoTipo: nodo.tipo, estado: "SKIPPED", ms: 0 },
                });
                continue;
            }

            const t0 = Date.now();
            const cfg = (nodo.config ?? {}) as NodeConfig;
            let pasoEstado = "OK";
            let output: Record<string, unknown> | null = null;

            try {
                switch (nodo.tipo) {
                    case "AI_ACTION": {
                        if (!context.entity) throw new Error("entityId required for AI_ACTION");
                        await aiLeadScoring(context.entity.id, context.workflowOrgId);
                        output = { scored: true, entityId: context.entity.id };
                        break;
                    }

                    case "UPDATE_LEAD": {
                        if (!context.entity) throw new Error("entityId required for UPDATE_LEAD");
                        if (!cfg.fields || Object.keys(cfg.fields).length === 0) {
                            throw new Error("UPDATE_LEAD requires config.fields");
                        }
                        const updated = await prisma.lead.updateMany({
                            where: { id: context.entity.id, orgId: context.workflowOrgId },
                            data: cfg.fields,
                        });
                        if (updated.count !== 1) {
                            throw new Error("Lead not found for workflow organization");
                        }
                        output = { updated: cfg.fields };
                        break;
                    }

                    case "CONDITION": {
                        if (!cfg.field || !cfg.operator) {
                            throw new Error("CONDITION requires config.field and config.operator");
                        }
                        let passed = false;
                        if (context.entity) {
                            const fieldVal = context.entity.data[cfg.field];
                            passed = evalCondition(fieldVal, cfg.operator, cfg.value);
                            output = { field: cfg.field, fieldVal, operator: cfg.operator, expected: cfg.value, passed };
                        }
                        if (!passed) {
                            running = false;
                            pasoEstado = "SKIPPED";
                        }
                        break;
                    }

                    case "WAIT": {
                        // Pause the run — async resume handled externally
                        await prisma.workflowRun.update({
                            where: { id: run.id },
                            data: { estado: "PAUSED" },
                        });
                        output = { pausedAt: new Date().toISOString() };
                        running = false;
                        runEstado = "PAUSED";
                        break;
                    }

                    case "WEBHOOK": {
                        if (!cfg.url) throw new Error("WEBHOOK requires config.url");
                        let entityData: unknown = {};
                        if (context.entity) {
                            entityData = context.entity.data;
                        }
                        const res = await fetch(cfg.url, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ trigger: context.trigger, entityId: context.entity?.id ?? entityId, entityData }),
                        });
                        output = { status: res.status, ok: res.ok };
                        if (!res.ok) throw new Error(`Webhook responded ${res.status}`);
                        break;
                    }

                    default:
                        output = { skipped: true, reason: `Unknown node type: ${nodo.tipo}` };
                        pasoEstado = "SKIPPED";
                }
            } catch (err) {
                pasoEstado = "ERROR";
                const msg = err instanceof Error ? err.message : String(err);
                output = { error: msg };
                if (!cfg.continueOnError) {
                    running = false;
                    runEstado = "FAILED";
                }
            }

            await prisma.workflowRunPaso.create({
                data: {
                    runId: run.id,
                    nodoTipo: nodo.tipo,
                    input: { nodoId: nodo.id, config: nodo.config } as object,
                    output: output as object,
                    estado: pasoEstado,
                    ms: Date.now() - t0,
                },
            });
        }

        // Finalise run
        await prisma.workflowRun.update({
            where: { id: run.id },
            data: { estado: runEstado, finishedAt: new Date() },
        });

        const pasos = await prisma.workflowRunPaso.findMany({
            where: { runId: run.id },
            select: { id: true, nodoTipo: true, estado: true, ms: true },
            orderBy: { createdAt: "asc" },
        });

        return { runId: run.id, estado: runEstado, pasos };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await prisma.workflowRun.update({
            where: { id: run.id },
            data: { estado: "FAILED", error: msg, finishedAt: new Date() },
        });
        throw err;
    }
}
