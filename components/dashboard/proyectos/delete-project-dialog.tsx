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
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DeleteProjectDialogProps {
    projectId: string;
    projectTitle: string;
    trigger?: React.ReactNode;
    onDeleteOptimistic?: () => void;
}

export function DeleteProjectDialog({ projectId, projectTitle, trigger, onDeleteOptimistic }: DeleteProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setOpen(false);
        if (onDeleteOptimistic) onDeleteOptimistic();

        const deletePromise = fetch(`/api/proyectos/${projectId}`, {
            method: "DELETE",
        }).then(async (res) => {
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Error al eliminar el proyecto");
            }
            router.refresh();
            return "Proyecto eliminado";
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando proyecto...',
            success: (data) => data,
            error: (err) => {
                // Here we could handle rollback if we had a more complex state,
                // but for now router.refresh() or manual intervention is needed if it fails.
                // In ProjectsListClient, the item is filtered out. If it fails, it will reappear 
                // on next real refresh or we could manually restore it.
                return err.message || "Error al eliminar el proyecto";
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-rose-600">
                        <AlertTriangle className="w-5 h-5" />
                        Eliminar Proyecto
                    </DialogTitle>
                    <DialogDescription className="py-2">
                        ¿Estás seguro que deseas eliminar el proyecto <span className="font-bold text-slate-900 dark:text-white">"{projectTitle}"</span>?
                        <br /><br />
                        <span className="font-semibold text-rose-600">Esta acción no se puede deshacer.</span> Se eliminarán todas las unidades, etapas, reservas y datos asociados.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isDeleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Eliminando...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Eliminar Definitivamente
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
