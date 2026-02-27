"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PauseCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateProyectoStatus } from "@/lib/actions/proyectos";

interface SuspendProjectDialogProps {
    projectId: string;
    projectTitle: string;
    currentStatus: string;
    trigger?: React.ReactNode;
}

export function SuspendProjectDialog({ projectId, projectTitle, currentStatus, trigger }: SuspendProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSuspending, setIsSuspending] = useState(false);
    const router = useRouter();

    const isSuspended = currentStatus === "SUSPENDIDO";

    const handleSuspend = async () => {
        setIsSuspending(true);
        try {
            const nextStatus = isSuspended ? "PLANIFICACION" : "SUSPENDIDO";
            const res = await updateProyectoStatus(projectId, nextStatus);

            if (!res.success) {
                throw new Error(res.error || "Error al actualizar el estado del proyecto");
            }

            toast.success(isSuspended ? "Proyecto reactivado correctamente" : "Proyecto suspendido correctamente");
            setOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
            console.error(error);
        } finally {
            setIsSuspending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon"
                        title={isSuspended ? "Reactivar Proyecto" : "Suspender por falta de pago"}
                        className={isSuspended ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50" : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"}>
                        <PauseCircle className="w-4 h-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="w-5 h-5" />
                        {isSuspended ? "Reactivar Proyecto" : "Suspender Proyecto"}
                    </DialogTitle>
                    <DialogDescription className="py-2">
                        {isSuspended ? (
                            <>¿Estás seguro que deseas reactivar el proyecto <span className="font-bold text-slate-900 dark:text-white">"{projectTitle}"</span>?</>
                        ) : (
                            <>
                                ¿Estás seguro que deseas suspender el proyecto <span className="font-bold text-slate-900 dark:text-white">"{projectTitle}"</span> por falta de pago?
                                <br /><br />
                                <span className="font-semibold text-amber-600">El proyecto dejará de estar visible para ventas y se marcará como suspendido.</span>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSuspending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant={isSuspended ? "default" : "destructive"}
                        onClick={handleSuspend}
                        disabled={isSuspending}
                        className="gap-2"
                    >
                        {isSuspending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <PauseCircle className="w-4 h-4" />
                                {isSuspended ? "Reactivar Proyecto" : "Confirmar Suspensión"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
