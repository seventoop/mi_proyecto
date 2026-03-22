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
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getProyectos } from "@/lib/actions/proyectos";
import { toast } from "sonner";

const createLeadSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    telefono: z.string().optional(),
    origen: z.enum(["WEB", "WHATSAPP", "REFERIDO"]),
    mensaje: z.string().optional(),
    proyectoId: z.string().optional(),
});

type CreateLeadForm = z.infer<typeof createLeadSchema>;

export default function NewLeadModal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [proyectos, setProyectos] = useState<any[]>([]);
    const [loadingProyectos, setLoadingProyectos] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateLeadForm>({
        resolver: zodResolver(createLeadSchema),
        defaultValues: {
            origen: "REFERIDO"
        }
    });

    useEffect(() => {
        if (open) {
            fetchProyectos();
        }
    }, [open]);

    const fetchProyectos = async () => {
        setLoadingProyectos(true);
        try {
            const res = await getProyectos();
            if (res.success && res.data) {
                setProyectos(res.data);
            } else {
                setProyectos([]);
            }
        } catch (error) {
            setProyectos([]);
        } finally {
            setLoadingProyectos(false);
        }
    };

    const onSubmit = async (data: CreateLeadForm) => {
        try {
            const res = await fetch("/api/crm/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Error al crear lead");

            toast.success("Lead creado correctamente");
            setOpen(false);
            reset();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Error al crear el lead");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-brand-black border-white/10 text-brand-surface shadow-2xl">
                <DialogHeader>
                    <DialogTitle>Nuevo Lead</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre Completo</label>
                        <input
                            {...register("nombre")}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface"
                            placeholder="Ej: Juan Pérez"
                        />
                        {errors.nombre && (
                            <p className="text-xs text-red-400">{errors.nombre.message}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                {...register("email")}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface"
                                placeholder="juan@email.com"
                            />
                            {errors.email && (
                                <p className="text-xs text-red-400">{errors.email.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Teléfono</label>
                            <input
                                {...register("telefono")}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface"
                                placeholder="+54 9 11..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Origen</label>
                            <select
                                {...register("origen")}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface cursor-pointer"
                            >
                                <option value="WEB">Web</option>
                                <option value="WHATSAPP">WhatsApp</option>
                                <option value="REFERIDO">Referido</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Proyecto Interés</label>
                            <select
                                {...register("proyectoId")}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface cursor-pointer"
                            >
                                <option value="">Ninguno</option>
                                {proyectos.map((p) => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nota Inicial</label>
                        <textarea
                            {...register("mensaje")}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange/50 transition-all text-brand-surface min-h-[80px] resize-none"
                            placeholder="Detalles sobre el interés..."
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orangeDark text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-brand-orange/20 active:scale-95"
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Crear Lead
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
