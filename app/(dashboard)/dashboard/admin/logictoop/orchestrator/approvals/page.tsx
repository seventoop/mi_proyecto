import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
                <p className="text-muted-foreground">No hay tareas pendientes en modo inerte.</p>
            </div>
        );
    }

    // 3. Caso: Módulo activo (Fase 2C.2+)
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Bandeja de Aprobaciones</h1>
            <p className="text-muted-foreground">Consultando base de datos local...</p>
            {/* Aquí se inyectará el ApprovalsClient en la Subfase 2C.2 */}
        </div>
    );
}
