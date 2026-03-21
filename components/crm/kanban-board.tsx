"use client";

import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import LeadCard from "./lead-card";
import { createPortal } from "react-dom";
import { Oportunidad, Lead } from "@prisma/client";
import { useDroppable } from "@dnd-kit/core";
import LeadDetailModal from "./lead-detail-modal";
import { updateOportunidad } from "@/lib/actions/crm-actions";

// Define columns based on Schema Enum
const COLUMNS = [
    { id: "NUEVO", label: "Nuevo" },
    { id: "CONTACTADO", label: "Contactado" },
    { id: "CALIFICADO", label: "Calificado" },
    { id: "VISITA", label: "Visitas / Entrevistas" },
    { id: "NEGOCIACION", label: "En Seguimiento" },
    { id: "RESERVA", label: "Reserva" },
];

interface KanbanBoardProps {
    oportunidades: (Oportunidad & { lead: Lead })[];
}

export default function KanbanBoard({ oportunidades: initialData }: KanbanBoardProps) {
    const [oportunidades, setOportunidades] = useState(initialData);
    const [activeOp, setActiveOp] = useState<(Oportunidad & { lead: Lead }) | null>(
        null
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid drag on simple clicks
            },
        })
    );

    function handleDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === "Oportunidad") {
            setActiveOp(event.active.data.current.oportunidad);
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveOp(null);

        if (!over) return;

        const opId = active.id as string;
        const newStage = over.id as string;

        // Find the dragged item
        const op = oportunidades.find(o => o.id === opId);
        if (!op) return;

        if (op.etapa !== newStage) {
            // Optimistic UI Update
            setOportunidades((prev) =>
                prev.map((item) =>
                    item.id === opId ? { ...item, etapa: newStage as any } : item
                )
            );

            // Update via server action
            const result = await updateOportunidad(opId, { etapa: newStage });
            if (!result.success) {
                console.error("Failed to update status", result.error);
                // Revert on error
                setOportunidades((prev) =>
                    prev.map((item) =>
                        item.id === opId ? { ...item, etapa: op.etapa } : item
                    )
                );
            }
        }
    }

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    // Custom click handler for cards
    const handleCardClick = (leadId: string) => {
        setSelectedLeadId(leadId);
    };

    return (
        <div className="h-full overflow-x-auto pb-4">
            <LeadDetailModal
                leadId={selectedLeadId}
                open={!!selectedLeadId}
                onOpenChange={(open) => !open && setSelectedLeadId(null)}
            />
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 min-w-[1200px] h-full">
                    {COLUMNS.map((col) => (
                        <Column
                            key={col.id}
                            id={col.id}
                            title={col.label}
                            oportunidades={oportunidades.filter((op) => op.etapa === col.id)}
                            onCardClick={handleCardClick}
                        />
                    ))}
                </div>

                {createPortal(
                    <DragOverlay>
                        {activeOp && <LeadCard oportunidad={activeOp} />}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
        </div>
    );
}

function Column({
    id,
    title,
    oportunidades,
    onCardClick
}: {
    id: string;
    title: string;
    oportunidades: (Oportunidad & { lead: Lead })[];
    onCardClick?: (leadId: string) => void;
}) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div ref={setNodeRef} className="w-[300px] flex-shrink-0 flex flex-col h-full bg-brand-black/40 rounded-[1.5rem] border border-white/5 backdrop-blur-sm">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-slate-300 text-sm">{title}</h3>
                <span className="bg-white/10 text-xs px-2 py-0.5 rounded-full text-slate-400">
                    {oportunidades.length}
                </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]">
                {oportunidades.map((op) => (
                    <div key={op.id} onClick={() => onCardClick?.(op.leadId)}>
                        <LeadCard oportunidad={op} />
                    </div>
                ))}
            </div>
        </div>
    );
}
