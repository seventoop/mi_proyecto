"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getAiTaskDetail } from "@/lib/actions/logictoop-ai";
import { Loader2, AlertCircle, Calendar, User, Cpu } from "lucide-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TaskDetailDialogProps {
    taskId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ taskId, open, onOpenChange }: TaskDetailDialogProps) {
    const [task, setTask] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                            </div>
                        </div>

                        {/* Payloads */}
                        <div className="space-y-4">
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
                        </div>

                        {/* Auditoría */}
                        <div>
                            <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Auditoría (Approvals)</h3>
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
                                <p className="text-sm text-muted-foreground italic">No hay registros de auditoría para esta tarea.</p>
                            )}
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
