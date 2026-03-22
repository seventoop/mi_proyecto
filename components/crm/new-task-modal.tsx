"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const createTaskSchema = z.object({
    titulo: z.string().min(1, "El título es obligatorio"),
    descripcion: z.string().optional(),
    fechaVencimiento: z.string().min(1, "La fecha es obligatoria"),
    prioridad: z.enum(["BAJA", "MEDIA", "ALTA"]),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

export default function NewTaskModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateTaskForm>({
        resolver: zodResolver(createTaskSchema),
        defaultValues: {
            prioridad: "MEDIA",
            fechaVencimiento: new Date().toISOString().split('T')[0] // Today
        }
    });

    const onSubmit = async (data: CreateTaskForm) => {
        try {
            const res = await fetch("/api/crm/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Error al crear tarea");

            setOpen(false);
            reset();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear la tarea");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                <DialogHeader>
                    <DialogTitle>Nueva Tarea</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Título</label>
                        <input
                            {...register("titulo")}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                            placeholder="Ej: Llamar a cliente..."
                        />
                        {errors.titulo && (
                            <p className="text-xs text-red-400">{errors.titulo.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Descripción</label>
                        <textarea
                            {...register("descripcion")}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 min-h-[60px]"
                            placeholder="Detalles adicionales..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vencimiento</label>
                            <input
                                type="date"
                                {...register("fechaVencimiento")}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500 [color-scheme:light] dark:[color-scheme:dark]"
                            />
                            {errors.fechaVencimiento && (
                                <p className="text-xs text-red-400">{errors.fechaVencimiento.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Prioridad</label>
                            <select
                                {...register("prioridad")}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                            >
                                <option value="BAJA">Baja</option>
                                <option value="MEDIA">Media</option>
                                <option value="ALTA">Alta</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Crear Tarea
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
