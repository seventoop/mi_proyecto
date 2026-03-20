"use client";

import { useState } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from "@dnd-kit/core";
import { updateLeadStatus } from "@/lib/actions/leads";
import { updateLeadEtapa } from "@/lib/actions/crm-actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, Calendar, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LeadDetailDrawer from "./lead-detail-drawer";

const DEFAULT_COLUMNS = [
    { id: "NUEVO", nombre: "Nuevos", color: "bg-blue-500" },
    { id: "CONTACTADO", nombre: "Contactado", color: "bg-amber-500" },
    { id: "INTERESADO", nombre: "Interesado", color: "bg-purple-500" },
    { id: "VISITA", nombre: "Visita Prog.", color: "bg-pink-500" },
    { id: "RESERVA", nombre: "Reservado", color: "bg-emerald-500" },
    { id: "PERDIDO", nombre: "Perdido", color: "bg-slate-500" },
];

export default function LeadsKanban({
    leads,
    planFeatures = [],
    etapas = []
}: {
    leads: any[],
    planFeatures?: string[],
    etapas?: any[]
}) {
    const [items, setItems] = useState(leads);
    const [activeId, setActiveId] = useState<string | null>(null);

    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const hasAiScoring = planFeatures.includes("ai_scoring");
    const columns = etapas.length > 0 ? etapas : DEFAULT_COLUMNS;

    const openLead = (lead: any) => {
        setSelectedLead(lead);
        setIsDrawerOpen(true);
    };

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (!over) return;

        const leadId = active.id;
        const newColId = over.id;
        const currentLead = items.find(l => l.id === leadId);

        const hasChanged = currentLead && (
            (etapas.length > 0 && currentLead.etapaId !== newColId) ||
            (etapas.length === 0 && currentLead.estado !== newColId)
        );

        if (hasChanged) {
            // Optimistic Update
            setItems(items.map(l =>
                l.id === leadId ? { ...l, etapaId: newColId, estado: newColId } : l
            ));

            // Use etapa-based update when pipeline etapas are configured, estado-based otherwise
            const res = etapas.length > 0
                ? await updateLeadEtapa(leadId, newColId)
                : await updateLeadStatus(leadId, newColId);

            if (!res.success) {
                toast.error("Error al actualizar estado");
                // Revert
                setItems(items.map(l =>
                    l.id === leadId ? { ...l, etapaId: currentLead.etapaId, estado: currentLead.estado } : l
                ));
            } else {
                toast.success(`Lead movido satisfactoriamente`);
            }
        }
        setActiveId(null);
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} collisionDetection={closestCorners}>
            <div className="flex h-full overflow-x-auto gap-4 pb-4">
                {columns.map(col => (
                    <Column key={col.id} col={col} items={items.filter(i => (i.etapaId === col.id) || (etapas.length === 0 && i.estado === col.id))} hasAiScoring={hasAiScoring} onLeadClick={openLead} />
                ))}
            </div>
            <DragOverlay>
                {activeId ? <LeadCard lead={items.find(i => i.id === activeId)} /> : null}
            </DragOverlay>

            <LeadDetailDrawer
                lead={selectedLead}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                etapas={etapas}
                hasAiScoring={hasAiScoring}
            />
        </DndContext>
    );
}

function Column({ col, items, hasAiScoring, onLeadClick }: { col: any, items: any[], hasAiScoring: boolean, onLeadClick?: (lead: any) => void }) {
    const { setNodeRef } = useDroppable({ id: col.id });
    const bgColor = col.color.startsWith('#') ? col.color : null;

    return (
        <div ref={setNodeRef} className="min-w-[310px] w-[310px] flex flex-col bg-slate-50/50 dark:bg-white/[0.01] rounded-2xl border border-slate-200 dark:border-white/[0.04] h-full max-h-[calc(100vh-220px)] shadow-sm dark:shadow-none">
            <div className="p-4 border-b border-slate-100 dark:border-white/[0.04] flex justify-between items-center sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn("w-1.5 h-1.5 rounded-full", !bgColor && col.color)}
                        style={bgColor ? { backgroundColor: bgColor } : {}}
                    />
                    <span className="text-sm font-black text-slate-900 dark:text-zinc-100 uppercase tracking-widest">{col.nombre || col.title}</span>
                </div>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/30 text-xs font-black border-none px-2 py-0">
                    {items.length}
                </Badge>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {items.map(lead => (
                    <DraggableLeadCard key={lead.id} lead={lead} hasAiScoring={hasAiScoring} onClick={() => onLeadClick?.(lead)} />
                ))}
            </div>
        </div>
    );
}

function DraggableLeadCard({ lead, hasAiScoring, onClick }: { lead: any, hasAiScoring: boolean, onClick?: () => void }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: lead.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="relative">
            <div {...listeners} className="cursor-grab active:cursor-grabbing">
                <LeadCard lead={lead} hasAiScoring={hasAiScoring} onClick={onClick} />
            </div>
        </div>
    );
}

function ScoreBadge({ score }: { score: number }) {
    if (score > 70) return <span className="px-1.5 py-0.5 rounded text-xs font-black border border-rose-500/20 text-rose-500 bg-rose-500/10">HOT</span>;
    if (score > 40) return <span className="px-1.5 py-0.5 rounded text-xs font-black border border-amber-500/20 text-amber-500 bg-amber-500/10">WARM</span>;
    return <span className="px-1.5 py-0.5 rounded text-xs font-black border border-blue-500/20 text-blue-500 bg-blue-500/10">COLD</span>;
}

function LeadCard({ lead, hasAiScoring, onClick }: { lead: any, hasAiScoring?: boolean, onClick?: () => void }) {
    const score = lead.aiQualificationScore ?? lead.score ?? 0;

    const getOriginIcon = (canal: string) => {
        switch (canal?.toUpperCase()) {
            case 'FACEBOOK': return <span className="text-[#1877F2]">FB</span>;
            case 'INSTAGRAM': return <span className="text-[#E4405F]">IG</span>;
            case 'TIKTOK': return <span className="text-white">TT</span>;
            case 'WHATSAPP': return <span className="text-[#25D366]">WA</span>;
            default: return null;
        }
    };

    return (
        <Card
            className="p-4 bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-sm dark:shadow-none group relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer rounded-xl"
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {getOriginIcon(lead.canalOrigen)}
                        <h4 className="text-[13px] font-black text-slate-900 dark:text-zinc-100 group-hover:text-brand-500 transition-colors uppercase tracking-tight truncate max-w-[160px]">{lead.nombre}</h4>
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-white/20 uppercase tracking-tighter">
                        {lead.proyecto?.nombre || "General"}
                    </p>
                </div>

                {hasAiScoring && score > 0 ? (
                    <ScoreBadge score={score} />
                ) : (
                    <div className="px-1.5 py-0.5 rounded text-xs font-black border border-slate-200 dark:border-white/10 text-slate-300 dark:text-white/10">
                        —
                    </div>
                )}
            </div>

            <div className="space-y-1.5 my-4">
                {lead.email && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-white/20 uppercase tracking-tight">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-white/10" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}
                {lead.telefono && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-400 dark:text-white/20 uppercase tracking-tight">
                        <Phone className="w-3 h-3 text-slate-400 dark:text-white/10" />
                        <span>{lead.telefono}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/20 font-black uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}</span>
                </div>
                {lead.asignadoA && (
                    <Avatar className="w-5 h-5 border border-slate-100 dark:border-white/10 shadow-sm">
                        <AvatarImage src={lead.asignadoA.avatar} />
                        <AvatarFallback className="text-[8px] font-black bg-brand-500/10 text-brand-500">{lead.asignadoA.nombre.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </Card>
    );
}
