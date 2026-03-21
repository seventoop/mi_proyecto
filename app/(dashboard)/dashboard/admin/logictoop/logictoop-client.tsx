"use client";

import { useState } from "react";
import { 
    Zap, Play, Power, History, Layout, 
    Plus, Settings2, CheckCircle2, XCircle, Clock,
    ChevronRight, ExternalLink, Box, Copy, Edit3
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Table, TableBody, TableCell, TableHead, 
    TableHeader, TableRow 
} from "@/components/ui/table";
import {
    Sheet, SheetContent, SheetDescription,
    SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { 
    Card, CardContent, CardDescription, 
    CardHeader, CardTitle 
} from "@/components/ui/card";
import { changeFlowStatus, createFlowFromTemplate, getFlowExecutions, cloneFlow } from "@/lib/actions/logictoop";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
    initialData: any;
    orgs: any[];
}

export function LogicToopDashboardClient({ initialData, orgs }: Props) {
    const router = useRouter();
    const [flows, setFlows] = useState(initialData?.flows || []);
    const [latestExecutions, setLatestExecutions] = useState(initialData?.latestExecutions || []);
    const [selectedFlowExecutions, setSelectedFlowExecutions] = useState<any[]>([]);
    const [isLoadingExecutions, setIsLoadingExecutions] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, PAUSED

    const handleToggle = async (flowId: string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
        const res = await changeFlowStatus(flowId, newStatus as any);
        if (res.success) {
            setFlows(flows.map((f: any) => f.id === flowId ? { ...f, status: newStatus, activo: newStatus === "ACTIVE" } : f));
            toast.success(`Flow ${newStatus === "ACTIVE" ? 'activado' : 'pausado'}`);
        } else {
            toast.error((res as any).error || "Error al actualizar");
        }
    };

    const handleCreateFromTemplate = async (templateId: string, orgId: string) => {
        const res = await createFlowFromTemplate(templateId, orgId);
        if (res.success) {
            setFlows([res.data, ...flows]);
            toast.success("Flow creado desde plantilla");
        } else {
            toast.error("Error al crear flow");
        }
    };

    const handleClone = async (flowId: string) => {
        const res = await cloneFlow(flowId);
        if (res.success) {
            setFlows([res.data, ...flows]);
            toast.success("Flow clonado correctamente");
        } else {
            toast.error("Error al clonar flow");
        }
    };

    const viewExecutions = async (flowId: string) => {
        setIsLoadingExecutions(true);
        const res = await getFlowExecutions(flowId);
        if (res.success) {
            setSelectedFlowExecutions(res.data);
        }
        setIsLoadingExecutions(false);
    };

    const filteredFlows = flows.filter((f: any) => {
        const matchesSearch = f.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              f.org?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || 
                              (statusFilter === "ACTIVE" && f.status === "ACTIVE") || 
                              (statusFilter === "PAUSED" && f.status !== "ACTIVE");
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="grid gap-8 lg:grid-cols-3">
            {/* List of Flows */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Zap className="w-5 h-5 text-brand-500" />
                        Flows Activos
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/admin/logictoop/templates">
                            <Button variant="outline" className="border-brand-500/30 text-brand-500 font-black italic uppercase text-xs tracking-tighter rounded-full px-6 hover:bg-brand-500/10">
                                <Box className="w-4 h-4 mr-2" /> Marketplace
                            </Button>
                        </Link>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-brand-500 hover:bg-brand-600 text-white font-black italic uppercase text-xs tracking-tighter rounded-full px-6">
                                    <Plus className="w-4 h-4 mr-2" /> Nuevo Flow
                                </Button>
                            </DialogTrigger>
                        <DialogContent className="max-w-3xl dark:bg-[#09090b] border-white/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter text-brand-500">
                                    Crear desde Plantilla
                                </DialogTitle>
                                <DialogDescription className="font-bold uppercase text-xs tracking-widest text-slate-500">
                                    Selecciona un patrón de automatización y una organización
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 overflow-y-auto max-h-[60vh]">
                                {initialData?.templates?.map((t: any) => (
                                    <Card key={t.id} className="bg-white/5 border-white/10 hover:border-brand-500/50 transition-all cursor-pointer group">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-black uppercase italic tracking-tighter group-hover:text-brand-500 transition-colors">
                                                {t.nombre}
                                            </CardTitle>
                                            <CardDescription className="text-xs font-bold uppercase text-slate-500">
                                                Trigger: {t.triggerType}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-400 mb-4 h-8 overflow-hidden">{t.descripcion}</p>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase text-brand-500/70 tracking-widest">Acciones:</p>
                                                {(t.defaultActions as any[])?.map((a, idx) => (
                                                    <div key={idx} className="text-xs font-bold text-slate-300 flex items-center gap-1 uppercase italic">
                                                        <ChevronRight className="w-3 h-3 text-brand-500" /> {a.type}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-6 flex flex-col gap-2">
                                                <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Seleccionar Orga:</p>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {orgs.map(org => (
                                                        <Button 
                                                            key={org.id}
                                                            size="sm" 
                                                            variant="outline"
                                                            className="h-7 border-white/10 text-xs font-black uppercase italic hover:bg-brand-500/10 hover:text-brand-500"
                                                            onClick={() => handleCreateFromTemplate(t.id, org.id)}
                                                        >
                                                            {org.nombre}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-4 bg-white/5 p-2 rounded-xl border border-white/5">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o organización..."
                        className="bg-black/20 border-white/10 text-xs uppercase font-black italic rounded-lg px-3 py-1.5 focus:border-brand-500/50 outline-none flex-1 min-w-[200px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <div className="flex gap-1">
                        {["ALL", "ACTIVE", "PAUSED"].map((status) => (
                            <Button
                                key={status}
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "text-xs font-black uppercase italic h-7 px-3 rounded-lg border border-white/5",
                                    statusFilter === status ? "bg-brand-500/20 text-brand-500 border-brand-500/30" : "text-slate-500 hover:text-white"
                                )}
                            >
                                {status === "ALL" ? "Todos" : status === "ACTIVE" ? "Activos" : "Pausados"}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="glass-card overflow-hidden border-white/10">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10">
                                <TableHead className="text-xs font-black uppercase text-slate-400">Flow / Orga</TableHead>
                                <TableHead className="text-xs font-black uppercase text-slate-400">Trigger</TableHead>
                                <TableHead className="text-xs font-black uppercase text-slate-400">Ejecuciones</TableHead>
                                <TableHead className="text-xs font-black uppercase text-slate-400 text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFlows.map((flow: any) => (
                                <TableRow key={flow.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-white uppercase italic tracking-tighter">{flow.nombre}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-brand-500 font-extrabold uppercase tracking-widest">{flow.org?.nombre}</span>
                                                <span className="text-[8px] font-black uppercase text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                    {Array.isArray(flow.actions) ? flow.actions.length : 0} PASOS
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-white/20 text-white text-xs font-black uppercase italic tracking-tighter">
                                            {flow.triggerType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => router.push(`/dashboard/admin/logictoop/canvas/${flow.id}`)}
                                                className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors border border-transparent hover:border-emerald-500/30"
                                                title="Abrir Lienzo Visual"
                                            >
                                                <Layout className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => router.push(`/dashboard/admin/logictoop/builder/${flow.id}`)}
                                                className="p-1.5 hover:bg-brand-500/20 text-brand-500 rounded-lg transition-colors border border-transparent hover:border-brand-500/30"
                                                title="Editar con Constructor Guiado"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleClone(flow.id)}
                                                className="p-1.5 hover:bg-white/10 text-slate-400 rounded-lg transition-colors border border-transparent hover:border-white/10"
                                                title="Clonar Flow"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                            <Sheet onOpenChange={() => viewExecutions(flow.id)}>
                                                <SheetTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-black uppercase italic bg-white/5 hover:bg-white/10">
                                                        Logs
                                                    </Button>
                                                </SheetTrigger>
                                                <SheetContent className="w-full sm:max-w-xl dark:bg-[#09090b] border-white/10 overflow-y-auto">
                                                    <SheetHeader className="mb-8">
                                                        <SheetTitle className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                                                            <History className="w-8 h-8 text-brand-500" />
                                                            Historial de <span className="text-brand-500 font-black italic uppercase">Ejecuciones</span>
                                                        </SheetTitle>
                                                        <SheetDescription className="font-black uppercase text-xs tracking-widest text-slate-500">
                                                            Flow: {flow.nombre} ({flow.triggerType})
                                                        </SheetDescription>
                                                    </SheetHeader>
                                                    
                                                    <div className="space-y-4">
                                                        {isLoadingExecutions ? (
                                                            <div className="py-12 text-center font-black uppercase italic animate-pulse">Cargando logs...</div>
                                                        ) : selectedFlowExecutions.map((exec: any) => (
                                                            <div key={exec.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" /> {new Date(exec.startedAt).toLocaleString()}
                                                                        </span>
                                                                        <span className="text-xs font-bold text-slate-400">ID: {exec.id.slice(-8)}</span>
                                                                    </div>
                                                                    <Badge className={cn(
                                                                        "text-xs font-black uppercase italic tracking-tighter",
                                                                        exec.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" : "bg-rose-500/20 text-rose-500 hover:bg-rose-500/30"
                                                                    )}>
                                                                        {exec.status}
                                                                    </Badge>
                                                                </div>

                                                                <div className="flex items-center gap-2 mb-3 bg-white/5 p-2 rounded-lg">
                                                                    <Box className="w-3 h-3 text-brand-500" />
                                                                    <span className="text-xs font-black uppercase italic text-slate-300">
                                                                        Entidad: {(exec.triggerPayload as any)?.nombre || (exec.triggerPayload as any)?.leadId || (exec.triggerPayload as any)?.proyectoId || "Sistema"}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-2 border-l-2 border-white/5 ml-2 pl-4">
                                                                    {exec.logs?.map((log: any, idx: number) => (
                                                                        <div key={idx} className="flex items-center justify-between text-sm">
                                                                            <div className="flex items-center gap-2">
                                                                                {log.status === "SUCCESS" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                                                                                <span className="font-bold text-slate-300 italic uppercase">{log.action}</span>
                                                                            </div>
                                                                            <span className="text-xs text-slate-600 font-mono">OK</span>
                                                                        </div>
                                                                    ))}
                                                                    {exec.errorMessage && (
                                                                        <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500 font-bold uppercase italic italic">
                                                                            ERROR: {exec.errorMessage}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {selectedFlowExecutions.length === 0 && !isLoadingExecutions && (
                                                            <div className="py-12 text-center text-slate-500 font-black uppercase italic">Sin ejecuciones registradas</div>
                                                        )}
                                                    </div>
                                                </SheetContent>
                                            </Sheet>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            onClick={() => handleToggle(flow.id, flow.status)}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "font-black uppercase italic text-xs tracking-tighter rounded-full px-4 h-7",
                                                flow.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20"
                                            )}
                                        >
                                            <Power className="w-3 h-3 mr-1" />
                                            {flow.status === "ACTIVE" ? 'Activo' : 'Inactivo'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {flows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-slate-500 italic uppercase font-black tracking-widest text-xs">
                                        No hay flows configurados. Crea uno desde plantillas.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Recent Global Executions */}
            <div className="space-y-4">
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                    <History className="w-5 h-5 text-brand-500" />
                    Monitor global
                </h2>
                <div className="space-y-3">
                    {latestExecutions.map((exec: any) => (
                        <div key={exec.id} className="glass-card p-4 border-white/5 hover:border-white/10 transition-all flex items-start gap-3">
                            <div className={cn(
                                "mt-1 p-1.5 rounded-lg",
                                exec.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                                {exec.status === "SUCCESS" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-[13px] text-white uppercase italic tracking-tighter leading-none mb-1 truncate">
                                    {exec.flow?.nombre}
                                </p>
                                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                                    <span>#{exec.id.slice(-6)}</span>
                                    <span>•</span>
                                    <span>{new Date(exec.startedAt).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase italic opacity-70">
                                    Target: {(exec.triggerPayload as any)?.nombre || (exec.triggerPayload as any)?.leadId || "N/A"}
                                </p>
                            </div>
                        </div>
                    ))}
                    {latestExecutions.length === 0 && (
                        <div className="glass-card p-8 text-center text-slate-500 font-bold uppercase text-xs italic tracking-widest border-white/5 border-dashed">
                            Esperando actividad...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
