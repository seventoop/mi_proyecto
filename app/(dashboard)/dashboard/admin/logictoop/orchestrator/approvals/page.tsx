import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AiApprovalsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.orgId) {
        redirect("/dashboard");
    }

    // SECURITY FLAG: Fallback seguro si el módulo está apagado o la DB no está migrada
    if (process.env.FEATURE_FLAG_LOGICTOOP_AI_UI !== "true") {
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

    // TODO: En subfases futuras, cuando la DB esté lista, importaremos getPendingApprovals y ApprovalsClient.
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold">Bandeja de Aprobaciones</h1>
            <p className="text-muted-foreground">Cargando...</p>
        </div>
    );
}
