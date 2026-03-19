"use client";

import { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    createPipelineEtapa,
    updatePipelineEtapa,
    deletePipelineEtapa,
    reorderPipelineEtapas
} from "@/lib/actions/crm-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Plus,
    GripVertical,
    Pencil,
    Trash2,
    Check,
    X,
    Settings2
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function SortableItem({ etapa, editingId, setEditingId, editNombre, setEditNombre, editColor, setEditColor, handleUpdate, setDeleteId }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: etapa.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="group">
            <Card className={cn(
                "p-4 bg-slate-900 border-slate-800 transition-all group-hover:border-slate-700",
                editingId === etapa.id ? "ring-2 ring-brand-orange border-brand-orange" : ""
            )}>
                <div className="flex items-center gap-4">
                    <div {...attributes} {...listeners} className="text-slate-600 hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />

                    {editingId === etapa.id ? (
                        <div className="flex-1 flex gap-2">
                            <Input
                                value={editNombre}
                                onChange={(e) => setEditNombre(e.target.value)}
                                className="bg-slate-800 border-slate-700 h-9"
                            />
                            <Input
                                type="color"
                                value={editColor}
                                onChange={(e) => setEditColor(e.target.value)}
                                className="w-10 h-9 p-1 bg-slate-800 border-slate-700"
                            />
                            <Button size="sm" onClick={() => handleUpdate(etapa.id)} className="bg-emerald-600 hover:bg-emerald-500">
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">{etapa.nombre}</h3>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-brand-orange"
                                    onClick={() => {
                                        setEditingId(etapa.id);
                                        setEditNombre(etapa.nombre);
                                        setEditColor(etapa.color);
                                    }}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-rose-500"
                                    onClick={() => setDeleteId(etapa.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}

export default function PipelineConfigClient({ orgId, initialEtapas }: { orgId: string, initialEtapas: any[] }) {
    const [etapas, setEtapas] = useState(initialEtapas);
    const [isAdding, setIsAdding] = useState(false);
    const [newNombre, setNewNombre] = useState("");
    const [newColor, setNewColor] = useState("#6366f1");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNombre, setEditNombre] = useState("");
    const [editColor, setEditColor] = useState("");

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [destEtapaId, setDestEtapaId] = useState<string>("");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = etapas.findIndex((e) => e.id === active.id);
            const newIndex = etapas.findIndex((e) => e.id === over.id);

            const newEtapas = arrayMove(etapas, oldIndex, newIndex).map((e, i) => ({
                ...e,
                orden: i + 1
            }));

            setEtapas(newEtapas);

            const res = await reorderPipelineEtapas(orgId, newEtapas.map(e => e.id));
            if (!res.success) {
                toast.error("Error al reordenar etapas");
                setEtapas(etapas);
            }
        }
    };

    const handleAdd = async () => {
        if (!newNombre.trim()) return;
        const res = await createPipelineEtapa(orgId, {
            nombre: newNombre,
            color: newColor,
            orden: etapas.length + 1
        });
        if (res.success) {
            setEtapas([...etapas, res.data]);
            setNewNombre("");
            setIsAdding(false);
            toast.success("Etapa creada");
        } else {
            toast.error(res.error || "Error al crear etapa");
        }
    };

    const handleUpdate = async (id: string) => {
        const res = await updatePipelineEtapa(id, {
            nombre: editNombre,
            color: editColor
        });
        if (res.success) {
            setEtapas(etapas.map(e => e.id === id ? res.data : e));
            setEditingId(null);
            toast.success("Etapa actualizada");
        } else {
            toast.error(res.error || "Error al actualizar");
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await deletePipelineEtapa(deleteId, destEtapaId);
        if (res.success) {
            setEtapas(etapas.filter(e => e.id !== deleteId));
            setDeleteId(null);
            setDestEtapaId("");
            toast.success("Etapa eliminada");
        } else {
            toast.error(res.error || "Error al eliminar");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end items-center">
                <Button onClick={() => setIsAdding(true)} className="gradient-brand shadow-glow hover:shadow-glow-lg text-white font-bold gap-2">
                    <Plus className="w-4 h-4" /> Nueva Etapa
                </Button>
            </div>

            {isAdding && (
                <Card className="p-6 bg-slate-900 border-brand-orange/30 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Etapa</label>
                            <Input
                                value={newNombre}
                                onChange={(e) => setNewNombre(e.target.value)}
                                placeholder="Ej: Negociación"
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Color</label>
                            <div className="flex gap-2 items-center">
                                <Input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="w-12 h-10 p-1 bg-slate-800 border-slate-700 cursor-pointer"
                                />
                                <Badge variant="outline" style={{ borderColor: newColor, color: newColor }}>
                                    Previsualización
                                </Badge>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6">
                                Guardar
                            </Button>
                            <Button variant="ghost" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={etapas.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {etapas.map((etapa) => (
                            <SortableItem
                                key={etapa.id}
                                etapa={etapa}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                editNombre={editNombre}
                                setEditNombre={setEditNombre}
                                editColor={editColor}
                                setEditColor={setEditColor}
                                handleUpdate={handleUpdate}
                                setDeleteId={setDeleteId}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="bg-slate-900 border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                            <Trash2 className="w-6 h-6 text-rose-500" />
                            Eliminar Etapa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-slate-400">
                            ¿Estás seguro de que deseas eliminar esta etapa? Si hay leads en esta etapa, debes seleccionar a dónde moverlos.
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Mover leads a:</label>
                            <Select value={destEtapaId} onValueChange={setDestEtapaId}>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Seleccionar etapa de destino" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                    {etapas.filter(e => e.id !== deleteId).map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400 hover:text-white">
                            Cancelar
                        </Button>
                        <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                            Confirmar Eliminación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
