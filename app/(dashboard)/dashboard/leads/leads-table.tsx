"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserPlus, Phone, Mail, Search, MoreVertical, Trash2, Loader2, MessageCircle, Sparkles, Copy, Brain, Zap, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { deleteLead } from "@/lib/actions/leads";
import { getAICopilotSuggestion } from "@/lib/actions/ai";
import { toast } from "sonner";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface LeadsTableProps {
    leads: any[];
}

const estadoBadge: Record<string, string> = {
    NUEVO: "bg-brand-500/10 text-brand-400",
    CONTACTADO: "bg-amber-500/10 text-amber-400",
    CALIFICADO: "bg-emerald-500/10 text-emerald-400",
    PERDIDO: "bg-rose-500/10 text-rose-400",
};

const origenBadge: Record<string, string> = {
    WEB: "bg-brand-500/10 text-brand-400",
    WHATSAPP: "bg-green-500/10 text-green-400",
    REFERIDO: "bg-purple-500/10 text-purple-400",
    IMPORTACION: "bg-blue-500/10 text-blue-400",
    MANUAL: "bg-slate-500/10 text-slate-400",
};

const automationBadge: Record<string, string> = {
    MANUAL: "bg-slate-500/10 text-slate-400",
    COPILOT: "bg-brand-500/10 text-brand-400",
    PILOT: "bg-indigo-500/10 text-indigo-400",
    AI_SCORED: "bg-violet-500/10 text-violet-400",
};

function ScoreBadge({ score }: { score: number | null | undefined }) {
    if (score === null || score === undefined) {
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400">SIN SCORE</span>;
    }
    if (score >= 80) {
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">HOT</span>;
    }
    if (score >= 50) {
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">WARM</span>;
    }
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400">COLD</span>;
}

export default function LeadsTable({ leads }: LeadsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateSearch = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val) params.set("search", val);
        else params.delete("search");

        startTransition(() => {
            router.push(`/dashboard/leads?${params.toString()}`);
        });
    };

    const handleDelete = async (id: string) => {
        const deletePromise = deleteLead(id).then((res) => {
            if (res.success) {
                router.refresh();
                return "Lead eliminado";
            }
            throw new Error(res.error || "Error al eliminar lead");
        });

        toast.promise(deletePromise, {
            loading: 'Eliminando lead...',
            success: (data) => data,
            error: (err) => err.message
        });
    };

    const [aiLoading, setAiLoading] = useState<string | null>(null);
    const [aiSuggestion, setAiSuggestion] = useState<string>("");

    const handleGenerateSuggestion = async (leadId: string) => {
        setAiLoading(leadId);
        setAiSuggestion("");
        try {
            const res = await getAICopilotSuggestion(leadId);
            if (res.success && res.data) {
                setAiSuggestion(res.data);
            } else {
                toast.error(res.error || "Error al generar sugerencia");
            }
        } catch (error) {
            toast.error("Error al conectar con la IA");
        } finally {
            setAiLoading(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        defaultValue={searchParams.get("search") || ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            const timeout = setTimeout(() => updateSearch(val), 500);
                            return () => clearTimeout(timeout);
                        }}
                        placeholder="Buscar por nombre o email..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                </div>
            </div>

            <div className={cn("glass-card overflow-hidden transition-opacity", isPending && "opacity-50")}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Origen</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">IA Pilot</th>
                                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proyecto</th>
                                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {leads.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No hay leads registrados</td></tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold">
                                                    {lead.nombre.split(" ").map((n: string) => n[0]).join("")}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-white">{lead.nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                    <Mail className="w-3 h-3" /> {lead.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                                    <Phone className="w-3 h-3" /> {lead.telefono}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${origenBadge[lead.origen] || ""}`}>
                                                {lead.origen}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${estadoBadge[lead.estado] || ""}`}>
                                                {lead.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit flex items-center gap-1 ${automationBadge[lead.automationStatus] || ""}`}>
                                                    {lead.automationStatus === "PILOT" ? <Zap className="w-2.5 h-2.5" /> : lead.automationStatus === "COPILOT" ? <Sparkles className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                                                    {lead.automationStatus}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <ScoreBadge score={lead.aiQualificationScore} />
                                                    {lead.aiQualificationScore !== null && lead.aiQualificationScore !== undefined && (
                                                        <>
                                                            <div className="w-10 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        "h-full transition-all",
                                                                        lead.aiQualificationScore >= 80 ? "bg-emerald-500" : lead.aiQualificationScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                                    )}
                                                                    style={{ width: `${lead.aiQualificationScore}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-500">{lead.aiQualificationScore}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{lead.proyecto?.nombre || "N/A"}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {lead.telefono && (
                                                    <a
                                                        href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${lead.nombre}, te contacto de Seventoop por tu consulta sobre el proyecto ${lead.proyecto?.nombre || "nuestros desarrollos"}.`)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                                        title="Contactar por WhatsApp"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </a>
                                                )}

                                                <Dialog onOpenChange={(open) => { if (open) handleGenerateSuggestion(lead.id); }}>
                                                    <DialogTrigger asChild>
                                                        <button
                                                            className="p-2 rounded-lg text-brand-500 hover:bg-brand-500/10 transition-colors"
                                                            title="Sugerencia de IA (Copilot)"
                                                        >
                                                            <Sparkles className="w-4 h-4" />
                                                        </button>
                                                    </DialogTrigger>
                                                    <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 sm:max-w-[500px]">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <Sparkles className="w-5 h-5 text-brand-500" />
                                                                AI Copilot Suggestion
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                Sugerencia personalizada para <span className="font-bold text-slate-900 dark:text-white">{lead.nombre}</span>
                                                            </DialogDescription>
                                                        </DialogHeader>

                                                        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 relative min-h-[150px]">
                                                            {aiLoading === lead.id ? (
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                                                                    <p className="text-xs text-slate-500">Analizando proyecto y lead...</p>
                                                                </div>
                                                            ) : (
                                                                <div className="animate-in fade-in duration-500">
                                                                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                                        {aiSuggestion || "No se pudo generar la sugerencia. Por favor revisa la configuración del API Key y los campos del proyecto."}
                                                                    </p>
                                                                    {aiSuggestion && (
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(aiSuggestion);
                                                                                toast.success("Copiado al portapapeles");
                                                                            }}
                                                                            className="mt-4 flex items-center gap-2 text-xs font-bold text-brand-500 hover:text-brand-600 transition-colors"
                                                                        >
                                                                            <Copy className="w-3.5 h-3.5" /> Copiar Sugerencia
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="mt-4 space-y-2">
                                                            <p className="text-[10px] text-slate-500">
                                                                Tip: Puedes editar la sugerencia antes de enviarla o usarla como base para tu mensaje.
                                                            </p>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <button className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Eliminar Lead?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. Se eliminará permanentemente la información de <span className="font-bold text-slate-900 dark:text-white">{lead.nombre}</span>.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(lead.id)}
                                                                className="bg-rose-500 hover:bg-rose-600 text-white"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
