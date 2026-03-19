"use client";

import { useState } from "react";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import {
    Sheet, SheetContent, SheetDescription,
    SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings2, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateProjectFeatureFlags } from "@/lib/actions/plans";
import { deleteProyecto } from "@/lib/actions/proyectos";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    nombre: string;
    estado: string;
    organization?: {
        nombre: string;
        planRef?: {
            nombre: string;
        };
    } | null;
    featureFlags?: {
        id?: string;
        crm?: boolean;
        infoGeneral?: boolean;
        documentos?: boolean;
        pagos?: boolean;
        masterplan?: boolean;
        motorPlanos?: boolean;
        tour360?: boolean;
        metricas?: boolean;
        [key: string]: any;
    } | null;
    _count: {
        leads: number;
    };
}

interface AdminProjectsMatrixProps {
    projects: Project[];
}

export default function AdminProjectsMatrix({ projects }: AdminProjectsMatrixProps) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleFlagToggle = async (projectId: string, flag: string, value: boolean, currentFlags: any) => {
        setIsUpdating(true);
        try {
            const newFlags = { ...currentFlags, [flag]: value };
            delete newFlags.id;
            delete newFlags.projectId;
            delete newFlags.updatedAt;

            const resFound = await updateProjectFeatureFlags(projectId, newFlags);
            if (resFound.success) {
                toast.success("Flag actualizado correctamente");
                // In a real app, we would revalidate or update local state
                window.location.reload();
            } else {
                toast.error("Error al actualizar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="glass-card overflow-hidden border-white/10">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/5">
                    <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Proyecto</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Organización</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Estado</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400">Canal / CRM</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-400">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map((project) => (
                        <TableRow key={project.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-brand-500" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-none mb-1">{project.nombre}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-tighter">ID: {project.id}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-xs dark:text-slate-300">{project.organization?.nombre || "System"}</span>
                                    <Badge variant="outline" className="w-fit text-[9px] py-0 px-1 mt-1 border-emerald-500/30 text-emerald-500">
                                        PLAN: {project.organization?.planRef?.nombre || "FREE"}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={cn(
                                    "text-[10px] font-black",
                                    project.estado === "ACTIVO" ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"
                                )}>
                                    {project.estado}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-[9px]">{project._count.leads} Leads</Badge>
                                    {project.featureFlags?.crm ? (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-brand-500/10 text-brand-500">
                                            <Settings2 className="w-4 h-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="dark:bg-[#111116] border-white/10">
                                        <SheetHeader>
                                            <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">
                                                Configurar <span className="text-brand-500">Features</span>
                                            </SheetTitle>
                                            <SheetDescription className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                                                Control de acceso para {project.nombre}
                                            </SheetDescription>
                                        </SheetHeader>

                                        <div className="mt-8 space-y-6">
                                            <div className="p-4 bg-brand-500/5 rounded-2xl border border-brand-500/10 mb-6">
                                                <p className="text-[10px] font-black text-brand-500 uppercase mb-1">Plan de la Org</p>
                                                <p className="text-sm font-bold text-slate-100">{project.organization?.planRef?.nombre || "FREE"}</p>
                                            </div>

                                            <div className="space-y-4">
                                                <FeatureToggle
                                                    label="Información General"
                                                    flag="infoGeneral"
                                                    value={project.featureFlags?.infoGeneral ?? true}
                                                    onToggle={(val) => handleFlagToggle(project.id, "infoGeneral", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Documentos Legales"
                                                    flag="documentos"
                                                    value={project.featureFlags?.documentos ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "documentos", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Módulo de Pagos"
                                                    flag="pagos"
                                                    value={project.featureFlags?.pagos ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "pagos", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Masterplan Interactivo"
                                                    flag="masterplan"
                                                    value={project.featureFlags?.masterplan ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "masterplan", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Motor de Planos"
                                                    flag="motorPlanos"
                                                    value={project.featureFlags?.motorPlanos ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "motorPlanos", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Tour 360°"
                                                    flag="tour360"
                                                    value={project.featureFlags?.tour360 ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "tour360", val, project.featureFlags)}
                                                />
                                                <FeatureToggle
                                                    label="Métricas de Ventas"
                                                    flag="metricas"
                                                    value={project.featureFlags?.metricas ?? false}
                                                    onToggle={(val) => handleFlagToggle(project.id, "metricas", val, project.featureFlags)}
                                                />
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-500/10 text-rose-500">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="dark:bg-[#111116] border-white/10 text-slate-100">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Eliminás '{project.nombre}'?</AlertDialogTitle>
                                            <AlertDialogDescription className="text-slate-400">
                                                Esta acción realizará un borrado lógico. Los datos se conservan por 30 días antes de su eliminación definitiva.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-slate-100">Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={async () => {
                                                    const res = await deleteProyecto(project.id);
                                                    if (res.success) {
                                                        toast.success("Proyecto eliminado");
                                                        window.location.reload();
                                                    } else {
                                                        toast.error('error' in res ? res.error : "Error al eliminar");
                                                    }
                                                }}
                                                className="bg-rose-600 hover:bg-rose-700 text-white border-none"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function FeatureToggle({ label, flag, value, onToggle }: { label: string, flag: string, value: boolean, onToggle: (val: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-all">
            <span className="text-sm font-bold text-slate-300">{label}</span>
            <Switch checked={value} onCheckedChange={onToggle} />
        </div>
    );
}
