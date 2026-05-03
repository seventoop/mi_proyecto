import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAiTasks } from "@/lib/actions/logictoop-ai";
import { ApprovalsClient } from "./_components/approvals-client";

export default async function AiApprovalsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        redirect("/dashboard");
    }

    const isUiEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_UI === "true";
    const isCoreEnabled = process.env.FEATURE_FLAG_LOGICTOOP_AI_CORE === "true";

    // 1. Caso: Módulo totalmente deshabilitado
    if (!isUiEnabled) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-6">
                <div className="text-center space-y-4 max-w-md">
                    <h1 className="text-2xl font-bold">LogicToop AI Orchestrator</h1>
                    <p className="text-muted-foreground">
                        El módulo de orquestación de inteligencia artificial todavía no está habilitado en este entorno.
                    </p>
                </div>
            </div>
        );
    }

    // Obtener datos reales
    const orgId = session.user.orgId;
    const { data: tasks, error } = await getAiTasks(orgId);

    // 2. Caso: UI habilitada pero Backend IA inerte
    if (!isCoreEnabled) {
        return (
            <div className="p-6 space-y-4">
                <h1 className="text-2xl font-bold">Bandeja de Aprobaciones</h1>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-bold">Modo Lectura:</span> El motor central de IA (`CORE`) está desactivado. No se pueden procesar nuevas tareas en este momento.
                            </p>
                        </div>
                    </div>
                </div>
                {/* Mostramos tareas existentes aunque el core esté apagado (Modo lectura) */}
                <ApprovalsClient tasks={tasks || []} orgId={orgId} canWrite={false} />
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-red-500">Error al cargar datos de IA: {error}</div>;
    }

    // 3. Caso: Módulo activo
    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">Bandeja de Aprobaciones</h1>
            <p className="text-muted-foreground text-sm">
                Gestiona las solicitudes de inteligencia artificial que requieren revisión humana.
            </p>
            <ApprovalsClient tasks={tasks || []} orgId={orgId} canWrite={true} />
        </div>
    );
}
