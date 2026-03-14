# LogicToop v1 - Architecture Baseline

This document serves as the definitive architectural baseline for LogicToop v1 resulting from the consolidation of 12 developmental phases. LogicToop is a multi-tenant, background automation engine featuring intelligent nodes, autonomous AI agents, dynamic visualizations, and a workflow marketplace.

---

## 1. Implementation Phases Summary

1. **Phase 1 — Core automation engine**: Established the foundational Prisma models (`LogicToopFlow`, `LogicToopExecution`), basic engine dispatching, and core logging.
2. **Phase 2 — Scheduler and advanced triggers**: Implemented cron-based node execution, polling, and the `node-schedule` background worker.
3. **Phase 3 — Conditions, queues, delays and retries**: Introduced logical branching (`evaluateConditionSet`), asynchronous background queues via BullMQ/custom implementations, and execution delay logic.
4. **Phase 4 — Guided visual flow builder**: Added a structured, state-machine driven wizard for building standard automations via the UI.
5. **Phase 5 — Node canvas (ReactFlow)**: Transitioned standard forms to a fully interactive, drag-and-drop ReactFlow canvas representing the nodes and edges.
6. **Phase 6 — Node registry architecture**: Refactored hardcoded handlers into a modular, extensible `nodeRegistry`, allowing for typed node definitions with dynamic configuration schemas.
7. **Phase 7 — AI nodes integration**: Introduced the first deterministic LLM primitives (Classify, Score, Summarize, Route) with normalized JSON structured outputs.
8. **Phase 8 — Integration nodes and webhooks**: Connected the engine to external APIs via Webhook triggers, native HTTP requests, and third-party SaaS stubs.
9. **Phase 9 — AI autonomous agents**: Added unbounded reasoning loops via memory-backed agent runtimes capable of calling internal bound tools to achieve goals.
10. **Phase 10 — Workflow marketplace**: Created a categorized, versioned library of installable workflow templates for one-click tenant deployment.
11. **Phase 11 — Governance, limits, lifecycle states and observability**: Implemented strict Prisma enum states (`DRAFT`, `ACTIVE`), execution quotas, duplicate detection, and operational observability dashboards.
12. **Phase 12 — Analytics, cost control and automation intelligence**: Added commercial ROI dashboards, tracking automated lead assignments, AI token consumption, and unified cost metrics gracefully.

---

## 2. Core Architecture

LogicToop operates as a highly orchestrated pipeline:

- **Node Registry (`nodeRegistry.ts`)**: The dictionary of capability. Every action (Delay, AI, API) is registered here with its validation schema and execute handler.
- **Dispatcher (`dispatcher.ts`)**: The execution brain. It receives payloads, looks up the corresponding `ACTIVE` flows for the given `triggerType`, and orchestrates the traversal of the Node definition array sequentially.
- **Worker / Queue**: Asynchronous processing. Nodes that define delays or heavy I/O operations yield control back, delegating future execution to a resilient background queue.
- **Scheduler**: A background chronometer that polls for delayed executions tracking the `resumeAt` property.
- **AI Runtime / Agents Runtime (`ai/client.ts`, `agents/agentRuntime.ts`)**: Secure bounded LLM execution execution contexts. Agents retain short-term memory across sequential steps and can utilize explicitly mapped schema tools.
- **Integration Nodes / Webhooks**: Dedicated API listener controllers mapping incoming generic webhooks back into standardized LogicToop triggers via `webhookRouter`.
- **Analytics Engine / Governance (`analytics/*`, `governance.ts`)**: Pre-execution gates ensuring quota compliance and post-execution aggregators summarizing the business and operational impact of runs.

### The Execution Pipeline
1. Event occurs (e.g. `NEW_LEAD` or incoming Webhook).
2. `dispatcher` queries database for `ACTIVE` flows with matching `orgId` and `triggerType`.
3. Dispatcher creates a `LogicToopExecution` record marking it `RUNNING`.
4. Dispatcher runs `executeFlow`, calling the respective registry handler for each defined action step.
5. Execution logs and AI cost metrics are appended to the record. Execution finishes as `SUCCESS` or pauses as `WAITING`.

---

## 3. Multi-Tenant Architecture

LogicToop inherently defends its data per-tenant via `orgId`.

- **Flows & Templates**: `LogicToopFlow` is rigidly bound to `orgId`. `LogicToopTemplate` (marketplace) is global, but installation deep-copies the template into a tenant-specific `LogicToopFlow`.
- **Executions & Logs**: `LogicToopExecution` cascades from `LogicToopFlow`. Therefore, an execution context explicitly traces back to exactly one tenant.
- **Integrations & Webhooks**: Webhook URLs are either universally generated with an attached encrypted Token (which decodes to `flowId` -> `orgId`) to prevent spoofing.
- **AI Agents**: Every LLM Context window is spun up isolated per-execution. No multi-tenant memory bridging exists.
- **Analytics & Dashboards**: Operations like `getExecutionStats` strictly inject `{ where: { flow: { orgId } } }`. The Admin platform dashboards aggregate across the platform only when specifically invoking the explicit `requireRole("ADMIN")` override.

---

## 4. LogicToop v1 Production Readiness

The branch is locked down and production ready for modern SaaS deployment:

- **Automation Engine Capabilities**: Resilient, sequential execution of complex structured logic trees, background resuming, and retry management.
- **AI Capabilities**: Deterministic structured AI routing nodes and conversational autonomous agents with managed memory constraints.
- **Workflow Marketplace**: Extensible, one-click catalog enabling fast time-to-value for new organizations.
- **Governance and Limits**: Hard execution limits linked to the organization's subscription tier, safeguarding against runaways, recursive loops, and AI budgeting overflow.
- **Analytics and Observability**: Deep tracing for failed runs, AI Token ROI breakdowns, and CRM pipeline acceleration monitoring.
- **Tenant-Safe Architecture**: Prisma relational isolation completely verified across routing, execution, and rendering.
