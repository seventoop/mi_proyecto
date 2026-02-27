"use client";

import { useState } from "react";
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCorners } from "@dnd-kit/core";
import { updateLeadStatus } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, Calendar, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const COLUMNS = [
    { id: "NUEVO", title: "Nuevos", color: "bg-blue-500" },
    { id: "CONTACTADO", title: "Contactado", color: "bg-amber-500" },
    { id: "INTERESADO", title: "Interesado", color: "bg-purple-500" },
    { id: "VISITA", title: "Visita Prog.", color: "bg-pink-500" },
    { id: "RESERVA", title: "Reservado", color: "bg-emerald-500" },
    { id: "PERDIDO", title: "Perdido", color: "bg-slate-500" },
];

export default function LeadsKanban({ leads }: { leads: any[] }) {
    const [items, setItems] = useState(leads);
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragEnd = async (event: any) => {
        const { active, over } = event;

        if (!over) return;

        const leadId = active.id;
        const newStatus = over.id;
        const currentLead = items.find(l => l.id === leadId);

        if (currentLead && currentLead.estado !== newStatus) {
            // Optimistic Update
            setItems(items.map(l =>
                l.id === leadId ? { ...l, estado: newStatus } : l
            ));

            const res = await updateLeadStatus(leadId, newStatus);
            if (!res.success) {
                toast.error("Error al actualizar estado");
                // Revert
                setItems(items.map(l =>
                    l.id === leadId ? { ...l, estado: currentLead.estado } : l
                ));
            } else {
                toast.success(`Lead movido a ${newStatus}`);
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
                {COLUMNS.map(col => (
                    <Column key={col.id} col={col} items={items.filter(i => i.estado === col.id)} />
                ))}
            </div>
            <DragOverlay>
                {activeId ? <LeadCard lead={items.find(i => i.id === activeId)} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function Column({ col, items }: { col: any, items: any[] }) {
    const { setNodeRef } = useDroppable({ id: col.id });

    return (
        <div ref={setNodeRef} className="min-w-[300px] w-[300px] flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 h-full max-h-[calc(100vh-220px)]">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900/90 z-10 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${col.color}`} />
                    <span className="font-semibold text-slate-200">{col.title}</span>
                </div>
                <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                    {items.length}
                </Badge>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                {items.map(lead => (
                    <DraggableLeadCard key={lead.id} lead={lead} />
                ))}
            </div>
        </div>
    );
}

function DraggableLeadCard({ lead }: { lead: any }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: lead.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
            <LeadCard lead={lead} />
        </div>
    );
}

function LeadCard({ lead }: { lead: any }) {
    return (
        <Card className="p-3 bg-slate-800 border-slate-700 hover:border-slate-600 shadow-sm group">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-semibold text-white truncate max-w-[180px]">{lead.nombre}</h4>
                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{lead.proyecto?.nombre || "Sin proyecto"}</p>
                </div>
                {/* <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400">
                    <MoreVertical className="w-4 h-4" />
                </button> */}
            </div>

            <div className="space-y-1.5 mb-3">
                {lead.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{lead.email}</span>
                    </div>
                )}
                {lead.telefono && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone className="w-3 h-3" />
                        <span>{lead.telefono}</span>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}</span>
                </div>
                {lead.asignadoA && (
                    <Avatar className="w-5 h-5">
                        <AvatarImage src={lead.asignadoA.avatar} />
                        <AvatarFallback className="text-[8px]">{lead.asignadoA.nombre.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                )}
            </div>
        </Card>
    );
}
