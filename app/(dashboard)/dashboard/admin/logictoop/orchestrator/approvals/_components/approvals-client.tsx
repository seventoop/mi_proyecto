"use client";

import { useState } from "react";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { rejectAiTask, approveAiTask, processAiTaskLocally } from "@/lib/actions/logictoop-ai";
import { Loader2, XCircle, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { format } from "date-fns";

interface ApprovalsClientProps {
    tasks: any[];
    orgId: string;
    canWrite: boolean;
}

export function ApprovalsClient({ tasks: initialTasks, orgId, canWrite }: ApprovalsClientProps) {
    const [tasks, setTasks] = useState(initialTasks);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleReject = async (taskId: string) => {
        if (!canWrite) {
            toast.error("El motor de IA está desactivado (Modo Lectura)");
            return;
        }

        const comment = window.prompt("Motivo del rechazo:");
        if (comment === null) return;

        setLoadingId(taskId);
        try {
            const res = await rejectAiTask(taskId, comment || "Rechazado por administrador");
            if (res.success) {
                toast.success("Tarea rechazada correctamente");
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "REJECTED" } : t));
            } else {
                toast.error(res.error || "Error al rechazar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoadingId(null);
        }
    };

    const handleApprove = async (taskId: string) => {
        if (!canWrite) {
            toast.error("El motor de IA está desactivado (Modo Lectura)");
            return;
        }

        const confirmed = window.confirm("¿Confirmar aprobación de esta tarea IA? No se aplicarán cambios reales en esta fase.");
        if (!confirmed) return;

        setLoadingId(taskId);
        try {
            const res = await approveAiTask(taskId);
            if (res.success) {
                toast.success("Tarea aprobada. No se aplicaron cambios reales en esta fase.");
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "APPROVED" } : t));
            } else {
                toast.error(res.error || "Error al aprobar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoadingId(null);
        }
    };

    const handleProcessLocally = async (taskId: string) => {
        if (!canWrite) {
            toast.error("El motor de IA está desactivado (Modo Lectura)");
            return;
        }

        setLoadingId(taskId);
        try {
            const res = await processAiTaskLocally(taskId);
            if (res.success) {
                toast.success("Tarea procesada localmente. El resultado ya está disponible para revisión.");
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: res.status } : t));
            } else {
                toast.error(res.error || "Error al procesar localmente");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoadingId(null);
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
        <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md">
                <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-blue-400 mr-2" />
                    <p className="text-sm text-blue-700 font-medium">
                        Modo Local Activo: Conexión con Paperclip desactivada. Las tareas son gestionadas internamente.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Tareas y Orquestaciones Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No se encontraron tareas registradas.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Agente</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Solicitante</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map((task) => (
                                    <TableRow key={task.id}>
                                        <TableCell className="text-xs">
                                            {format(new Date(task.createdAt), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{task.agent?.name}</div>
                                            <div className="text-xs text-muted-foreground">{task.agent?.role}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{task.requestedBy?.nombre}</div>
                                            <div className="text-xs text-muted-foreground">{task.requestedBy?.email}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {task.status === "PENDING" && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        className="text-blue-600 hover:bg-blue-50"
                                                        disabled={!canWrite || loadingId === task.id}
                                                        title="Procesar usando el runner interno (MOCK)"
                                                        onClick={() => handleProcessLocally(task.id)}
                                                    >
                                                        {loadingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
                                                        Procesar
                                                    </Button>
                                                )}
                                                {task.status === "NEEDS_APPROVAL" && (
                                                    <>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline"
                                                            className="text-red-600 hover:bg-red-50"
                                                            disabled={!canWrite || loadingId === task.id}
                                                            title={!canWrite ? "Modo Lectura Activo" : "Rechazar tarea"}
                                                            onClick={() => handleReject(task.id)}
                                                        >
                                                            {loadingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                                            Rechazar
                                                        </Button>
                                                        <Button 
                                                            size="sm"
                                                            disabled={!canWrite || loadingId === task.id}
                                                            title={!canWrite ? "Modo Lectura Activo" : "Aprobar tarea"}
                                                            onClick={() => handleApprove(task.id)}
                                                        >
                                                            {loadingId === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                                                            Aprobar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
