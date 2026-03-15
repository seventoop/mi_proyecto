"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Gauge as Badge } from "lucide-react"; // Temporary replacement if Badge component not found
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Mail, Phone, Plus, MessageSquare } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Lead, Oportunidad, Tarea } from "@prisma/client";

interface LeadDetailModalProps {
    leadId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Helper types since we don't have full generated types in this context
interface LeadNote {
    timestamp: Date | string;
    text: string;
    userName?: string;
    fecha: string;
    texto: string;
}

type LeadFull = Lead & {
    oportunidades: Oportunidad[];
    tareas: Tarea[];
    notas: LeadNote[];
    estado: string;
    nombre: string;
    origen: string;
    email: string | null;
    telefono: string | null;
    createdAt: Date;
};

export default function LeadDetailModal({ leadId, open, onOpenChange }: LeadDetailModalProps) {
    const [lead, setLead] = useState<LeadFull | null>(null);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState("");

    useEffect(() => {
        if (open && leadId) {
            fetchLead(leadId);
        }
    }, [open, leadId]);

    const fetchLead = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/leads/${id}`);
            if (res.ok) {
                const data = await res.json();
                setLead(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!leadId || !newNote.trim()) return;
        try {
            const res = await fetch(`/api/crm/leads/${leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota: newNote })
            });
            if (res.ok) {
                setNewNote("");
                fetchLead(leadId); // Refresh
            }
        } catch (e) {
            console.error(e);
        }
    };

    const notasList = useMemo(() => {
        if (!lead?.notas) return [];
        if (typeof lead.notas === 'string') {
            try { return JSON.parse(lead.notas); } catch { return []; }
        }
        return Array.isArray(lead.notas) ? lead.notas : [];
    }, [lead?.notas]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-brand-black border-white/10 text-brand-surface h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl">


                {loading || !lead ? (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        Cargando detalles...
                    </div>
                ) : (
                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar Info */}
                        <div className="w-1/3 bg-brand-black/40 p-6 border-r border-white/5 flex flex-col">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-brand-orange/10 text-brand-orange mx-auto flex items-center justify-center text-3xl font-black mb-3 border border-brand-orange/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                                    {lead.nombre.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="font-black text-xl text-brand-surface">{lead.nombre}</h3>
                                <p className="text-xs font-bold text-brand-muted mt-1 uppercase tracking-[0.2em]">{lead.origen}</p>
                                <div className="mt-3 inline-flex px-3 py-1 rounded-lg bg-white/5 text-[10px] font-black uppercase tracking-widest text-brand-surface/70 border border-white/5">
                                    {lead.estado}
                                </div>
                            </div>

                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Mail className="w-4 h-4 text-slate-500" />
                                    <a href={`mailto:${lead.email}`} className="hover:text-white truncate">{lead.email || "Sin email"}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Phone className="w-4 h-4 text-slate-500" />
                                    <a href={`tel:${lead.telefono}`} className="hover:text-white">{lead.telefono || "Sin teléfono"}</a>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <Calendar className="w-4 h-4 text-slate-500" />
                                    <span>Registrado el {format(new Date(lead.createdAt), "dd MMM yyyy", { locale: es })}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <button className="w-full py-3 bg-brand-orange hover:bg-brand-orangeDark text-white text-xs font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-orange/20 active:scale-95">
                                    <Plus className="w-4 h-4" /> Nueva Tarea
                                </button>
                            </div>
                        </div>

                        {/* Main Content Tabs */}
                        <div className="flex-1 flex flex-col bg-slate-950">
                            <Tabs defaultValue="timeline" className="flex-1 flex flex-col">
                                <div className="px-6 py-4 border-b border-white/10 bg-slate-900/30">
                                    <TabsList className="bg-slate-800 text-slate-400">
                                        <TabsTrigger value="timeline" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Actividad</TabsTrigger>
                                        <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white">Tareas</TabsTrigger>
                                    </TabsList>
                                </div>

                                <TabsContent value="timeline" className="flex-1 overflow-y-auto p-6 m-0">
                                    <div className="flex gap-3 mb-8">
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-[80px] focus:border-brand-orange/50 ring-0 outline-none resize-none text-brand-surface placeholder:text-brand-muted transition-all"
                                            placeholder="Escribe una nota interna..."
                                        />
                                        <button
                                            onClick={handleAddNote}
                                            disabled={!newNote.trim()}
                                            className="h-[80px] w-14 flex items-center justify-center bg-brand-orange hover:bg-brand-orangeDark disabled:opacity-50 disabled:bg-white/5 rounded-xl transition-all shadow-lg shadow-brand-orange/10"
                                        >
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest text-xs mb-4">Historial</h4>
                                        {notasList && notasList.length > 0 ? (
                                            <div className="space-y-6 border-l-2 border-slate-800 ml-2 pl-6">
                                                {notasList.map((nota: LeadNote, idx: number) => (
                                                    <div key={idx} className="relative">
                                                        <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-600 ring-4 ring-slate-950" />
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-white">{nota.userName || "Sistema"}</span>
                                                            <span className="text-xs text-slate-500">{format(new Date(nota.fecha), "dd MMM HH:mm", { locale: es })}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-white/5">
                                                            {nota.texto}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 text-sm italic">No hay actividad registrada.</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="tasks" className="flex-1 p-6 m-0">
                                    <p className="text-slate-500">Listado de tareas (pendiente de implementación visual)</p>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
