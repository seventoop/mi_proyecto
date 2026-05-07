import { Suspense } from "react";
import { getAiPausedFlowExecutions } from "@/lib/actions/logictoop-ai-flow";
import { PausedFlowsClient } from "./_components/paused-flows-client";
import { AlertCircle, Loader2 } from "lucide-react";

export const metadata = {
  title: "Flows pausados por IA | LogicToop AI",
  description: "Gestión de ejecuciones de flujo pausadas por tareas de IA",
};

interface PausedFlowsPageProps {
  searchParams: {
    orgId?: string;
  };
}

export default async function PausedFlowsPage({ searchParams }: PausedFlowsPageProps) {
  const orgId = searchParams.orgId || "";
  const res = await getAiPausedFlowExecutions(orgId);

  if (!res.success) {
    return (
      <div className="p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Error al cargar flujos</h1>
        <p className="text-muted-foreground">{res.error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Flows pausados por IA</h2>
          <p className="text-muted-foreground">
            Visualiza y prepara la reanudación de flujos detenidos por intervención humana.
          </p>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 font-medium">
              Modo seguro: esta pantalla no reanuda flows automáticamente ni ejecuta side-effects.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <PausedFlowsClient executions={res.data || []} />
      </Suspense>
    </div>
  );
}
