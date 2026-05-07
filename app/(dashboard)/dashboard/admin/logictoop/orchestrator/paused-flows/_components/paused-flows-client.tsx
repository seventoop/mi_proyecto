"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  ExternalLink, 
  Loader2, 
  Info, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";
import { markAiFlowResumeDryRun } from "@/lib/actions/logictoop-ai-flow";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface PausedFlowsClientProps {
  executions: any[];
}

export function PausedFlowsClient({ executions }: PausedFlowsClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";

  const handleResumeDryRun = async (executionId: string) => {
    if (!window.confirm("Esto NO reanuda el flow real. Solo registra una simulación auditada de 'Resume Readiness'. ¿Deseas continuar?")) {
      return;
    }

    setLoading(executionId);
    try {
      const res = await markAiFlowResumeDryRun(executionId);
      if (res.success) {
        if (res.alreadyExecuted) {
          toast.info(res.message || "Dry-run ya registrado.");
        } else {
          toast.success(res.message || "Resume dry-run registrado correctamente.");
        }
      } else {
        toast.error(res.error || "Error al registrar dry-run");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING_FOR_APPROVAL":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">WAITING FOR APPROVAL</Badge>;
      case "AI_APPROVED_WAITING_RESUME":
        return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">READY FOR RESUME</Badge>;
      case "AI_REJECTED":
        return <Badge variant="destructive">AI REJECTED</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (executions.length === 0) {
    return (
      <div className="border rounded-md p-12 text-center bg-muted/20">
        <div className="flex justify-center mb-4 text-muted-foreground">
          <Info className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-medium">No hay flujos pausados</h3>
        <p className="text-muted-foreground">
          No se encontraron ejecuciones esperando intervención de IA en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado Execution</TableHead>
            <TableHead>Flow / ID</TableHead>
            <TableHead>Task IA Vinculada</TableHead>
            <TableHead>Agente / Solicitante</TableHead>
            <TableHead>Actualizado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.map((execution) => {
            const task = execution.aiTasks?.[0];
            const isReady = execution.status === "AI_APPROVED_WAITING_RESUME";
            
            return (
              <TableRow key={execution.id}>
                <TableCell>
                  {getStatusBadge(execution.status)}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{execution.flow?.nombre || "Flow sin nombre"}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{execution.id}</div>
                </TableCell>
                <TableCell>
                  {task ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {task.id.substring(0, 8)}...
                        </Badge>
                        <span className={`text-[10px] font-semibold ${
                          task.status === "APPROVED" ? "text-green-600" : 
                          task.status === "REJECTED" ? "text-red-600" : 
                          "text-blue-600"
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <Link 
                        href={`/dashboard/admin/logictoop/orchestrator/approvals?taskId=${task.id}`}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Ver Task <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sin task vinculada</span>
                  )}
                </TableCell>
                <TableCell>
                  {task ? (
                    <div className="text-xs">
                      <div>{task.agent?.role || "Agente"}</div>
                      <div className="text-muted-foreground">{task.requestedBy?.nombre || "Sistema"}</div>
                    </div>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-xs">
                  {format(new Date(execution.startedAt), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={!isReady || !isSuperAdmin || loading === execution.id}
                      onClick={() => handleResumeDryRun(execution.id)}
                    >
                      {loading === execution.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 fill-current" />
                      )}
                      <span>Resume Dry-run</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
