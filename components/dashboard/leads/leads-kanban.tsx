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
        <div ref={setNodeRef} className="min-w-[300px] w-[300px] flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 h-full max-h-[calc(100vh-220px)]">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 z-10 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div
                        className={cn("w-3 h-3 rounded-full", !bgColor && col.color)}
                        style={bgColor ? { backgroundColor: bgColor } : {}}
                    />
                    <span className="font-semibold text-slate-200">{col.nombre || col.title}</span>
                </div>
                <Badge variant="secondary" className="bg-slate-800 text-slate-400">
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
    if (score > 70) return <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-rose-500/40 text-rose-500 bg-rose-500/10">HOT</span>;
    if (score > 40) return <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-amber-500/40 text-amber-500 bg-amber-500/10">WARM</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-black border border-blue-500/40 text-blue-500 bg-blue-500/10">COLD</span>;
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
            className="p-3 bg-slate-800 border-slate-700 hover:border-slate-600 shadow-sm group relative overflow-hidden transition-all cursor-pointer"
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        {getOriginIcon(lead.canalOrigen)}
                        <h4 className="font-semibold text-white truncate max-w-[150px]">{lead.nombre}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium px-1 bg-slate-900/50 rounded inline-block w-fit mt-1">
                        {lead.proyecto?.nombre || "General"}
                    </p>
                </div>

                {hasAiScoring && score > 0 ? (
                    <ScoreBadge score={score} />
                ) : (
                    <div className="px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-600 text-slate-600" title="AI Scoring no incluido en tu plan">
                        —
                    </div>
                )}
            </div>

            <div className="space-y-1 my-3">
                {lead.email && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}
                {lead.telefono && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{lead.telefono}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}</span>
                </div>
                {lead.asignadoA && (
                    <Avatar className="w-5 h-5 border border-slate-700">
                        <AvatarImage src={lead.asignadoA.avatar} />
                        <AvatarFallback className="text-[8px] bg-brand-orange/20 text-brand-orange">{lead.asignadoA.nombre.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </Card>
    );
}
