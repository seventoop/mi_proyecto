import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import KanbanBoard from "@/components/crm/kanban-board";
import TaskList from "@/components/crm/task-list";
import { Metadata } from "next";
import NewLeadModal from "@/components/crm/new-lead-modal";

export const metadata: Metadata = {
    title: "CRM | Seventoop",
};

export const dynamic = "force-dynamic";

export default async function CRMPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const orgId = (session.user as any).orgId as string | null;
    const isAdmin = (session.user as any).role === "ADMIN" || (session.user as any).role === "SUPERADMIN";

    // Org-scoped fetch: non-admin users only see their org's oportunidades
    const oportunidades = await db.oportunidad.findMany({
        where: isAdmin ? {} : { lead: { orgId: orgId ?? "__none__" } },
        orderBy: { updatedAt: "desc" },
        take: 100,
        include: {
            lead: true,
        }
    });

    // Fetch User's Tasks
    const tasks = await db.tarea.findMany({
        where: {
            usuarioId: session.user.id,
            estado: "PENDIENTE"
        },
        orderBy: { fechaVencimiento: "asc" },
        take: 20
    });

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-200 dark:border-white/10 px-6 flex items-center justify-between flex-shrink-0 bg-white dark:bg-slate-950">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                    CRM & Pipeline
                </h1>
                <div className="flex items-center gap-3">
                    <NewLeadModal>
                        <button className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20">
                            + Nuevo Lead
                        </button>
                    </NewLeadModal>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10 mx-2" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-bold">
                            {session.user.name?.[0] || "U"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4">

                {/* Board Area */}
                <div className="lg:col-span-3 h-full overflow-hidden p-6 bg-slate-50 dark:bg-slate-950 relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

                    <div className="relative h-full flex flex-col z-10">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Tablero de Oportunidades</h2>
                            {/* Filter controls could go here */}
                        </div>

                        <div className="flex-1 min-h-0">
                            <KanbanBoard oportunidades={oportunidades} />
                        </div>
                    </div>
                </div>

                {/* Sidebar (Tasks & Activity) */}
                <div className="lg:col-span-1 border-l border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50 backdrop-blur-sm p-4 h-full overflow-y-auto">
                    <TaskList tasks={tasks} />

                    {/* Metrics Placeholder */}
                    <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-brand-900/50 to-slate-900 border border-brand-500/10">
                        <h4 className="text-sm font-bold text-white mb-3">Resumen Mensual</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Leads Nuevos</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{oportunidades.filter(o => o.etapa === 'NUEVO').length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Cierres</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{oportunidades.filter(o => o.etapa === 'VENTA').length}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
