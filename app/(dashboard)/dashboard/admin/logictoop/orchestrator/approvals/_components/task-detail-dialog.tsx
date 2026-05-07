"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getAiTaskDetail } from "@/lib/actions/logictoop-ai";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, Calendar, User, Cpu, History, ListChecks, FileJson, Info, Play } from "lucide-react";
import { useSession } from "next-auth/react";
import { executeAiTaskDryRun } from "@/lib/actions/logictoop-ai-worker";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TaskDetailDialogProps {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ taskId, open, onOpenChange }: TaskDetailDialogProps) {
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [executingDryRun, setExecutingDryRun] = useState(false);
    const { data: session } = useSession();

    const isSuperAdmin = session?.user?.role === "SUPERADMIN";

    const hasCompletedDryRun = task?.events?.some((e: any) => e.type === "WORKER_DRY_RUN_COMPLETED");

    useEffect(() => {
        if (open && taskId) {
            loadTaskDetail(taskId);
        } else {
            setTask(null);
            setError(null);
        }
    }, [open, taskId]);

    const loadTaskDetail = async (id: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAiTaskDetail(id);
            if (res.success && res.data) {
                setTask(res.data);
            } else {
                setError(res.error || "Error al cargar la tarea");
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteDryRun = async () => {
        if (!taskId) return;
        
        const confirmMsg = "Esto simula el post-procesamiento técnico sin aplicar cambios reales. No se modifican proyectos, leads, banners ni emails. ¿Deseas continuar?";
        if (!window.confirm(confirmMsg)) return;

        setExecutingDryRun(true);
        try {
            const res = await executeAiTaskDryRun(taskId);
            if (res.success) {
                if (res.alreadyExecuted) {
                    toast.info(res.message || "Dry-run ya ejecutado previamente");
                } else {
                    toast.success(res.message || "Dry-run completado exitosamente");
                }
                // Recargar detalle para ver los nuevos eventos
                await loadTaskDetail(taskId);
            } else {
                toast.error(res.error || "Error al ejecutar dry-run");
            }
        } catch (err) {
            toast.error("Error de conexión al ejecutar dry-run");
        } finally {
            setExecutingDryRun(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING": return <Badge variant="secondary" className="bg-blue-100 text-blue-700">PENDING</Badge>;
            case "NEEDS_APPROVAL": return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">NEEDS_APPROVAL</Badge>;
            case "APPROVED": return <Badge variant="default" className="bg-green-100 text-green-700">APPROVED</Badge>;
            case "REJECTED": return <Badge variant="destructive">REJECTED</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        Detalle de Tarea IA
                        {task && getStatusBadge(task.status)}
                    </DialogTitle>
                    <DialogDescription>
                        Inspección profunda de payload, resultados y auditoría (Fase 3B)
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-md mt-2">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
                        <p className="text-sm text-blue-700 font-medium">
                            Modo Local: Sin side-effects / Paperclip desconectado
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 py-8">{error}</div>
                ) : task ? (
                    <div className="space-y-6 mt-4">
                        {/* Información General */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center text-muted-foreground mb-1"><Cpu className="w-4 h-4 mr-2" /> <strong>Agente</strong></div>
                                <p>{task.agent?.name} ({task.agent?.role})</p>
                                <p className="text-xs text-muted-foreground break-all">Task ID: {task.id}</p>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center text-muted-foreground mb-1"><User className="w-4 h-4 mr-2" /> <strong>Solicitante</strong></div>
                                <p>{task.requestedBy?.nombre || "Sistema"}</p>
                                <p className="text-xs text-muted-foreground break-all">ID: {task.requestedBy?.id}</p>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center text-muted-foreground mb-1"><Calendar className="w-4 h-4 mr-2" /> <strong>Fechas</strong></div>
                                <p>Creada: {format(new Date(task.createdAt), "dd/MM/yyyy HH:mm:ss")}</p>
                                <p>Actualizada: {format(new Date(task.updatedAt), "dd/MM/yyyy HH:mm:ss")}</p>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center text-muted-foreground mb-1"><AlertCircle className="w-4 h-4 mr-2" /> <strong>Métricas</strong></div>
                                <p>Tokens: {task.costTokens}</p>
                                <p>Run ID: {task.paperclipRunId || "N/A (Local)"}</p>
                                {task.executionId && (
                                    <p className="text-xs font-mono text-blue-600 bg-blue-50 px-1 rounded inline-block mt-1">
                                        Flow ID: {task.executionId}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sincronización de Flow (Fase 5C.1) */}
                        {task.executionId && (
                            <div className={`p-4 rounded-lg flex items-center gap-3 border ${
                                task.status === "APPROVED" 
                                    ? "bg-green-50 border-green-200 text-green-900" 
                                    : task.status === "REJECTED"
                                    ? "bg-red-50 border-red-200 text-red-900"
                                    : "bg-blue-50 border-blue-200 text-blue-900"
                            }`}>
                                <div className={`p-2 rounded-full ${
                                    task.status === "APPROVED" ? "bg-green-100 text-green-700" : 
                                    task.status === "REJECTED" ? "bg-red-100 text-red-700" : 
                                    "bg-blue-100 text-blue-700"
                                }`}>
                                    <ListChecks className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Flow vinculado</p>
                                    <p className="text-xs opacity-90">
                                        {task.status === "APPROVED" 
                                            ? "Listo para reanudación manual futura." 
                                            : task.status === "REJECTED"
                                            ? "Flow detenido por rechazo de IA."
                                            : "Esta tarea está vinculada a un flujo de LogicToop. La aprobación no reanuda automáticamente el flujo en esta fase."}
                                    </p>
                                    {task.status === "APPROVED" && (
                                        <div className="mt-1 space-y-1">
                                            <p className="text-[10px] font-semibold italic">
                                                * La aprobación no reanuda automáticamente el flujo en esta fase.
                                            </p>
                                            <p className="text-[10px] text-blue-700 font-bold">
                                                Disponible en "Flows pausados por IA" para resume dry-run.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Controles de Worker (Fase 4A) */}
                        {task.status === "APPROVED" && isSuperAdmin && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-yellow-900">Post-procesamiento Disponible</p>
                                        <p className="text-xs text-yellow-700">Simulación técnica del worker post-aprobación.</p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={handleExecuteDryRun} 
                                    disabled={executingDryRun || hasCompletedDryRun}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white border-none disabled:bg-yellow-100 disabled:text-yellow-600"
                                >
                                    {executingDryRun ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : hasCompletedDryRun ? (
                                        <ListChecks className="w-4 h-4 mr-2" />
                                    ) : (
                                        <Play className="w-4 h-4 mr-2 fill-current" />
                                    )}
                                    {hasCompletedDryRun ? "Dry-run ejecutado" : "Ejecutar dry-run"}
                                </Button>
                            </div>
                        )}

                        <Tabs defaultValue="payloads" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="payloads" className="flex items-center gap-2">
                                    <FileJson className="w-4 h-4" /> Payloads
                                </TabsTrigger>
                                <TabsTrigger value="approvals" className="flex items-center gap-2">
                                    <ListChecks className="w-4 h-4" /> Aprobaciones
                                </TabsTrigger>
                                <TabsTrigger value="events" className="flex items-center gap-2">
                                    <History className="w-4 h-4" /> Eventos
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="payloads" className="space-y-4 mt-4">
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Input Payload (Contexto)</h3>
                                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                                        {JSON.stringify(task.inputPayload, null, 2)}
                                    </pre>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Output Result (Propuesta)</h3>
                                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                                        {task.outputResult ? JSON.stringify(task.outputResult, null, 2) : "Aún no procesado"}
                                    </pre>
                                </div>
                            </TabsContent>

                            <TabsContent value="approvals" className="mt-4">
                                {task.approvals && task.approvals.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[140px]">Fecha</TableHead>
                                                    <TableHead>Acción</TableHead>
                                                    <TableHead>Usuario</TableHead>
                                                    <TableHead>Comentarios</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {task.approvals.map((approval: any) => (
                                                    <TableRow key={approval.id} className="text-xs">
                                                        <TableCell>{format(new Date(approval.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                                {approval.actionTaken}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{approval.approvedBy?.nombre || "N/A"}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate" title={approval.comments}>
                                                            {approval.comments || "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic p-4 text-center border rounded-md">No hay registros de aprobación para esta tarea.</p>
                                )}
                            </TabsContent>

                            <TabsContent value="events" className="mt-4">
                                {task.events && task.events.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[140px]">Fecha</TableHead>
                                                    <TableHead>Evento</TableHead>
                                                    <TableHead>Source</TableHead>
                                                    <TableHead>Actor</TableHead>
                                                    <TableHead>Mensaje</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {task.events.map((event: any) => (
                                                    <TableRow key={event.id} className="text-xs">
                                                        <TableCell>{format(new Date(event.createdAt), "dd/MM/yyyy HH:mm:ss")}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px] uppercase bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-100">
                                                                {event.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] text-muted-foreground">{event.source}</TableCell>
                                                        <TableCell>{event.actor?.nombre || "Sistema"}</TableCell>
                                                        <TableCell className="max-w-[200px] truncate" title={event.message}>
                                                            {event.message || "-"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic p-4 text-center border rounded-md">No hay eventos registrados para esta tarea.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
