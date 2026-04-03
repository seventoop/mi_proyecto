import { requireAnyRole } from "@/lib/guards";
import prisma from "@/lib/db";
import WorkflowsClient from "./workflows-client";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
    const user = await requireAnyRole(["ADMIN", "DESARROLLADOR"]);
    const where = user.role === "ADMIN" ? {} : { orgId: user.orgId ?? "___NO_ORG___" };

    const workflows = await prisma.workflow.findMany({
        where,
        include: {
            _count: { select: { nodos: true, runs: true } },
            runs: {
                orderBy: { startedAt: "desc" },
                take: 1,
                select: { id: true, estado: true, startedAt: true, finishedAt: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8 space-y-6 w-full">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                        Automation Engine
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Workflows nativos del CRM — versionados, auditables, sin infraestructura externa.
                    </p>
                </div>
            </div>
            <WorkflowsClient
                initialWorkflows={JSON.parse(JSON.stringify(workflows))}
                orgId={user.orgId}
            />
        </div>
    );
}
