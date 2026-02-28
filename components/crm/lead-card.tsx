import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Lead, Oportunidad } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, DollarSign, Mail, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LeadCardProps {
    oportunidad: Oportunidad & {
        lead: Lead;
    };
}

export default function LeadCard({ oportunidad }: LeadCardProps) {
    const { lead } = oportunidad;
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: oportunidad.id,
            data: {
                type: "Oportunidad",
                oportunidad,
            },
        });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="bg-brand-black/40 p-4 rounded-2xl border-2 border-brand-orange/30 shadow-xl opacity-50 h-[180px] animate-pulse"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="bg-brand-black/60 backdrop-blur-md border border-white/5 p-4 rounded-2xl hover:border-brand-orange/40 hover:bg-brand-black/80 transition-all cursor-grab active:cursor-grabbing group shadow-lg"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-brand-orange/10 text-brand-orange font-black border border-brand-orange/20">
                        <AvatarFallback className="bg-transparent">
                            {lead.nombre.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <h4 className="font-black text-brand-surface text-sm truncate max-w-[140px] tracking-tight">
                            {lead.nombre}
                        </h4>
                        <p className="text-[10px] font-black text-brand-orange truncate uppercase tracking-widest">
                            {oportunidad.valorEstimado
                                ? formatCurrency(Number(oportunidad.valorEstimado))
                                : "Sin valor"}
                        </p>
                    </div>
                </div>
                {oportunidad.probabilidad > 0 && (
                    <span
                        className={`text-[10px] font-black px-2 py-1 rounded-lg ${oportunidad.probabilidad > 70
                            ? "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
                            : oportunidad.probabilidad > 30
                                ? "bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20"
                                : "bg-white/5 text-brand-muted border border-white/10"
                            }`}
                    >
                        {oportunidad.probabilidad}%
                    </span>
                )}
            </div>

            <div className="space-y-1.5 mb-3">
                {lead.telefono && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {lead.telefono}
                    </div>
                )}
                {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {lead.email}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                <span className="text-[10px] text-brand-muted uppercase font-black tracking-widest">
                    {lead.origen}
                </span>
                <span className="text-[10px] text-brand-muted flex items-center gap-1.5 font-bold">
                    <Calendar className="w-3 h-3 text-brand-orange/50" />
                    {format(new Date(oportunidad.updatedAt), "d MMM", { locale: es })}
                </span>
            </div>
        </div>
    );
}
