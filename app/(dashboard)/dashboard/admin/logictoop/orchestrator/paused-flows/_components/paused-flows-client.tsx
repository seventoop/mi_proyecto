"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
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
  AlertTriangle,
  Filter,
  CheckCircle,
  Clock,
  Ban
} from "lucide-react";
import { 
  markAiFlowResumeDryRun, 
  getAiFlowResumePreview,
  controlledManualResumeFlow,
  executeSafeOneStepResume
} from "@/lib/actions/logictoop-ai-flow";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { ResumePreviewResult } from "@/lib/logictoop/ai-resume-preview";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PausedFlowsClientProps {
  executions: any[];
}

export function PausedFlowsClient({ executions }: PausedFlowsClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ResumePreviewResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";

  const filteredExecutions = executions.filter(ex => 
    statusFilter === "TODOS" ? true : ex.status === statusFilter
  );

  const counts = {
    total: executions.length,
    waiting: executions.filter(e => e.status === "WAITING_FOR_APPROVAL").length,
    ready: executions.filter(e => e.status === "AI_APPROVED_WAITING_RESUME").length,
    blocked: executions.filter(e => e.status === "AI_REJECTED").length,
    resumed: executions.filter(e => e.status === "MANUALLY_RESUMED_SAFE_REVIEW").length,
    pausedSafe: executions.filter(e => e.status === "PAUSED_AFTER_SAFE_STEP").length,
    completed: executions.filter(e => e.status === "COMPLETED_SAFE").length,
  };

  const FILTER_LABELS: Record<string, string> = {
    "TODOS": "Todos",
    "WAITING_FOR_APPROVAL": "Esperando aprobación",
    "AI_APPROVED_WAITING_RESUME": "Listo para resume",
    "AI_REJECTED": "Rechazado",
    "MANUALLY_RESUMED_SAFE_REVIEW": "Resume controlado",
    "PAUSED_AFTER_SAFE_STEP": "Pausado tras paso",
    "COMPLETED_SAFE": "Completado seguro",
  };

  const handlePreview = async (executionId: string) => {
    setLoading(`preview-${executionId}`);
    try {
      const res = await getAiFlowResumePreview(executionId);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setIsPreviewOpen(true);
      } else {
        toast.error(res.error || "Error al obtener previsualización");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  };

  const handleControlledResume = async (executionId: string) => {
    if (!window.confirm("CONFIRMACIÓN DE SEGURIDAD:\n\nEsta acción marcará el flujo como reanudado de forma segura, pero NO ejecutará el dispatcher ni los nodos reales en esta fase. Es puramente una marca de estado auditada.\n\n¿Estás seguro de continuar?")) {
      return;
    }

    setLoading("controlled-resume");
    try {
      const res = await controlledManualResumeFlow(executionId);
      if (res.success) {
        if (res.alreadyExecuted) {
          toast.info(res.message);
        } else {
          toast.success(res.message);
        }
        setIsPreviewOpen(false);
      } else {
        toast.error(res.error || "Error al ejecutar reanudación controlada");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  };

  const handleExecuteSafeStep = async (executionId: string) => {
    if (!window.confirm("CONFIRMACIÓN DE SEGURIDAD:\n\nEsto ejecutará como máximo un paso clasificado como seguro. No ejecutará dispatcher completo ni nodos comerciales.\n\n¿Estás seguro de continuar?")) {
      return;
    }

    setLoading("safe-step");
    try {
      const res = await executeSafeOneStepResume(executionId);
      if (res.success) {
        toast.success(res.message);
        setIsPreviewOpen(false);
      } else {
        toast.error(res.error || "Error al ejecutar paso seguro");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(null);
    }
  };

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
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Esperando aprobación</Badge>;
      case "AI_APPROVED_WAITING_RESUME":
        return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Listo para revisión</Badge>;
      case "AI_REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      case "MANUALLY_RESUMED_SAFE_REVIEW":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Resume controlado</Badge>;
      case "PAUSED_AFTER_SAFE_STEP":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pausado tras paso seguro</Badge>;
      case "COMPLETED_SAFE":
        return <Badge variant="default" className="bg-slate-100 text-slate-700 hover:bg-slate-200">Completado seguro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (executions.length === 0) {
    return (
      <div className="border rounded-md p-12 text-center bg-muted/20">
        <div className="flex justify-center mb-4 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-medium">No hay flujos pausados por IA</h3>
        <p className="text-muted-foreground max-w-md mx-auto mt-2">
          No se encontraron ejecuciones esperando intervención humana en este momento.
          Los flujos con nodos <code className="text-xs bg-muted px-1 py-0.5 rounded">AI_APPROVAL_TASK</code> aparecerán aquí cuando estén pausados.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/admin/logictoop/orchestrator/approvals"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            Ir a Bandeja de Aprobaciones <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="border rounded-lg p-3 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Info className="h-3.5 w-3.5" />
            <span>Total</span>
          </div>
          <div className="text-2xl font-bold">{counts.total}</div>
        </div>
        <div className="border rounded-lg p-3 bg-blue-50 text-blue-900 shadow-sm border-blue-100">
          <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Esperando</span>
          </div>
          <div className="text-2xl font-bold">{counts.waiting}</div>
        </div>
        <div className="border rounded-lg p-3 bg-green-50 text-green-900 shadow-sm border-green-100">
          <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Listos</span>
          </div>
          <div className="text-2xl font-bold">{counts.ready}</div>
        </div>
        <div className="border rounded-lg p-3 bg-red-50 text-red-900 shadow-sm border-red-100">
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-1">
            <Ban className="h-3.5 w-3.5" />
            <span>Rechazados</span>
          </div>
          <div className="text-2xl font-bold">{counts.blocked}</div>
        </div>
        <div className="border rounded-lg p-3 bg-purple-50 text-purple-900 shadow-sm border-purple-100">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 mb-1">
            <Play className="h-3.5 w-3.5" />
            <span>Reanudados</span>
          </div>
          <div className="text-2xl font-bold">{counts.resumed}</div>
        </div>
        <div className="border rounded-lg p-3 bg-amber-50 text-amber-900 shadow-sm border-amber-100">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Pausados</span>
          </div>
          <div className="text-2xl font-bold">{counts.pausedSafe}</div>
        </div>
        <div className="border rounded-lg p-3 bg-slate-50 text-slate-900 shadow-sm border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completados</span>
          </div>
          <div className="text-2xl font-bold">{counts.completed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-2 rounded-md border">
        <Filter className="h-4 w-4 text-muted-foreground ml-2" />
        <span className="text-sm text-muted-foreground mr-2">Filtro:</span>
        {["TODOS", "WAITING_FOR_APPROVAL", "AI_APPROVED_WAITING_RESUME", "AI_REJECTED", "MANUALLY_RESUMED_SAFE_REVIEW", "PAUSED_AFTER_SAFE_STEP", "COMPLETED_SAFE"].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="text-xs h-7"
          >
            {FILTER_LABELS[status] || status}
          </Button>
        ))}
      </div>

      <div className="rounded-md border bg-card">
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
          {filteredExecutions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                No hay ejecuciones que coincidan con el filtro.
              </TableCell>
            </TableRow>
          ) : (
            filteredExecutions.map((execution) => {
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
                      className="h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={!isReady || loading === `preview-${execution.id}`}
                      onClick={() => handlePreview(execution.id)}
                    >
                      {loading === `preview-${execution.id}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Info className="h-3 w-3" />
                      )}
                      <span>Preview</span>
                    </Button>

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
          }))}
        </TableBody>
      </Table>
    </div>

      {/* Modal de Previsualización Técnica */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Previsualización de Reanudación
            </DialogTitle>
            <DialogDescription>
              Análisis técnico del próximo nodo en la cola de ejecución.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Execution ID</span>
                    <p className="font-mono text-[10px] break-all">{previewData.executionId}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Estado Actual</span>
                    <div>{getStatusBadge(previewData.status)}</div>
                  </div>
                </div>

                <hr className="my-4 border-muted" />

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Próximo Nodo</h4>
                  {previewData.nextNode ? (
                    <div className="bg-muted/30 p-3 rounded-md border space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{previewData.nextNode.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{previewData.nextNode.uid}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {previewData.nextNode.type}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">No hay más nodos en el flujo.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Evaluación de Seguridad</h4>
                  <div className="flex items-center gap-2">
                    {previewData.classification === "SAFE_EXECUTABLE_NO_SIDE_EFFECT" && (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex gap-1">
                        <CheckCircle2 className="h-3 w-3" /> SEGURO PARA EJECUTAR
                      </Badge>
                    )}
                    {previewData.classification === "SAFE_REVIEW_ONLY" && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 flex gap-1">
                        <CheckCircle2 className="h-3 w-3" /> SOLO REVISIÓN
                      </Badge>
                    )}
                    {previewData.classification === "UNSAFE_SIDE_EFFECT" && (
                      <Badge variant="destructive" className="flex gap-1">
                        <AlertTriangle className="h-3 w-3" /> RIESGOSO
                      </Badge>
                    )}
                    {previewData.classification === "UNKNOWN" && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 flex gap-1">
                        <AlertTriangle className="h-3 w-3" /> DESCONOCIDO
                      </Badge>
                    )}
                    {previewData.classification === "NO_NEXT_NODE" && (
                      <Badge variant="secondary">FINALIZADO</Badge>
                    )}
                    
                    <span className="text-xs font-medium">
                      {previewData.recommendation === "SAFE_TO_EXECUTE" ? "Seguro para ejecutar un paso" :
                       previewData.recommendation === "SAFE_TO_REVIEW" ? "Listo para revisión técnica" :
                       previewData.recommendation === "BLOCKED_UNSAFE_NODE" ? "Reanudación bloqueada por seguridad" :
                       previewData.recommendation === "NO_NEXT_NODE" ? "Flujo completado" :
                       "Requiere inspección manual del esquema"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded border border-dashed">
                    {previewData.message}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-700">
                      <strong>Nota de seguridad:</strong> Esta previsualización es solo informativa. No se han ejecutado nodos, no se han enviado correos y no se ha alterado el estado de la base de datos comercial.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="flex sm:justify-between items-center w-full gap-2">
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
            {previewData && (
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  className="gap-2"
                  disabled={
                    !isSuperAdmin || 
                    loading === "controlled-resume" || 
                    previewData.classification === "UNSAFE_SIDE_EFFECT" || 
                    previewData.classification === "UNKNOWN" ||
                    previewData.classification === "NO_NEXT_NODE"
                  }
                  onClick={() => handleControlledResume(previewData.executionId)}
                >
                  {loading === "controlled-resume" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                  Marcar Solo Revisión
                </Button>

                <Button 
                  variant="default"
                  className="gap-2"
                  disabled={
                    !isSuperAdmin || 
                    loading === "safe-step" || 
                    previewData.classification === "UNSAFE_SIDE_EFFECT" || 
                    previewData.classification === "UNKNOWN" ||
                    previewData.classification === "SAFE_REVIEW_ONLY"
                  }
                  onClick={() => handleExecuteSafeStep(previewData.executionId)}
                >
                  {loading === "safe-step" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                  {previewData.classification === "NO_NEXT_NODE" ? "Cerrar Seguro" : 
                   previewData.classification === "SAFE_REVIEW_ONLY" ? "Solo revisión" :
                   previewData.classification === "UNSAFE_SIDE_EFFECT" ? "Bloqueado por side-effect" :
                   previewData.classification === "UNKNOWN" ? "Bloqueado: nodo desconocido" :
                   "Listo para paso seguro"}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
