"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Mail, Phone, MessageSquare, Info } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { addLeadNote } from "@/lib/actions/crm-actions";

interface LeadDetailModalProps {
    leadId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface LeadMessage {
    id: string;
    role: string;
    content: string;
    createdAt: string;
    user: { nombre: string } | null;
}

interface LeadFull {
    id: string;
    nombre: string;
    estado: string;
    origen: string;
    email: string | null;
    telefono: string | null;
    createdAt: string;
    mensajes: LeadMessage[];
}

export default function LeadDetailModal({ leadId, open, onOpenChange }: LeadDetailModalProps) {
    const [lead, setLead] = useState<LeadFull | null>(null);
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (open && leadId) {
            fetchLead(leadId);
        }
    }, [open, leadId]);

    const fetchLead = async (id: string) => {
        setLoading(true);
        setError(null);
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

    const handleAddNote = () => {
        if (!leadId || !newNote.trim()) return;
        const content = newNote.trim();
        setNewNote("");
        setError(null);

        startTransition(async () => {
            const result = await addLeadNote(leadId, content);
            if (result.success) {
                fetchLead(leadId);
            } else {
                setError(result.error ?? "Error al guardar la nota");
            }
        });
    };

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
                                <div className="mt-3 inline-flex px-3 py-1 rounded-lg bg-white/5 text-xs font-black uppercase tracking-widest text-brand-surface/70 border border-white/5">
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

                        </div>

                        {/* Activity Timeline */}
                        <div className="flex-1 flex flex-col bg-slate-950 p-6 overflow-y-auto">
                            <div className="flex gap-3 mb-8">
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-[80px] focus:border-brand-orange/50 ring-0 outline-none resize-none text-brand-surface placeholder:text-brand-muted transition-all"
                                    placeholder="Escribe una nota interna..."
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.trim() || isPending}
                                    className="h-[80px] w-14 flex items-center justify-center bg-brand-orange hover:bg-brand-orangeDark disabled:opacity-50 disabled:bg-white/5 rounded-xl transition-all shadow-lg shadow-brand-orange/10"
                                >
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {error && (
                                <p className="text-xs text-red-400 mb-4">{error}</p>
                            )}

                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Historial</h4>
                            {lead.mensajes.length > 0 ? (
                                <div className="space-y-6 border-l-2 border-slate-800 ml-2 pl-6">
                                    {lead.mensajes.map((msg) => {
                                        const isSystem = msg.role === "SYSTEM";
                                        return (
                                            <div key={msg.id} className="relative">
                                                <div className={`absolute -left-[31px] top-1 w-3 h-3 rounded-full ring-4 ring-slate-950 ${isSystem ? "bg-slate-700" : "bg-slate-600"}`} />
                                                <div className="flex items-center gap-2 mb-1">
                                                    {isSystem ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                                                            <Info className="w-3 h-3" /> Sistema
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-white">{msg.user?.nombre ?? "Sistema"}</span>
                                                    )}
                                                    <span className="text-xs text-slate-500">{format(new Date(msg.createdAt), "dd MMM HH:mm", { locale: es })}</span>
                                                </div>
                                                <p className={`text-sm p-3 rounded-lg border whitespace-pre-line ${isSystem ? "text-slate-400 bg-slate-900/30 border-white/[0.03] italic" : "text-slate-300 bg-slate-900/50 border-white/5"}`}>
                                                    {msg.content}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-500 text-sm italic">No hay actividad registrada.</p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
