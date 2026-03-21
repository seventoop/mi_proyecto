"use client";

import { useState, useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Mail,
    Phone,
    Calendar,
    User,
    Building2,
    MessageSquare,
    CheckCircle2,
    Clock,
    Zap,
    ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { updateLead, updateLeadStatus } from "@/lib/actions/leads";
import { updateLeadEtapa, convertLeadToOportunidad, addLeadNote } from "@/lib/actions/crm-actions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Etapa {
    id: string;
    nombre: string;
    color: string;
}

interface Lead {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    canalOrigen?: string;
    origen?: string;
    score?: number;
    estado?: string;
    etapaId?: string;
    proyectoId?: string | null;
    createdAt: string | Date;
    proyecto?: {
        nombre: string;
    } | null;
    etapa?: {
        nombre: string;
    } | null;
}

export default function LeadDetailDrawer({
    lead,
    isOpen,
    onClose,
    etapas = [],
    hasAiScoring = false
}: {
    lead: Lead,
    isOpen: boolean,
    onClose: () => void,
    etapas?: Etapa[],
    hasAiScoring?: boolean
}) {
    const [activeTab, setActiveTab] = useState("info");
    const [note, setNote] = useState("");
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

    if (!lead) return null;

    const score = lead.score || 0;
    const scoreColor = score > 70 ? "text-rose-500" : score > 40 ? "text-amber-500" : "text-blue-500";
    const scoreBg = score > 70 ? "bg-rose-500/10" : score > 40 ? "bg-amber-500/10" : "bg-blue-500/10";

    const handleConvert = async () => {
        if (!lead.proyectoId) {
            toast.error("El lead no tiene proyecto asignado");
            return;
        }
        setIsConverting(true);
        const res = await convertLeadToOportunidad(lead.id, lead.proyectoId);
        setIsConverting(false);
        if (res.success) {
            toast.success("Lead convertido a oportunidad");
        } else {
            toast.error(res.error || "Error al convertir");
        }
    };

    const handleStageChange = async (etapaId: string) => {
        setIsUpdating(true);
        const res = await updateLeadEtapa(lead.id, etapaId);
        setIsUpdating(false);
        if (res.success) {
            toast.success("Etapa actualizada");
        } else {
            toast.error("Error al actualizar etapa");
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-xl bg-slate-900 border-l-slate-800 p-0 text-white overflow-y-auto custom-scrollbar">
                {/* Header Section */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-20 backdrop-blur-md">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16 border-2 border-brand-orange ring-4 ring-brand-orange/10">
                                <AvatarFallback className="text-2xl bg-slate-800 text-brand-orange">
                                    {lead.nombre.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-2xl font-bold">{lead.nombre}</h2>
                                <p className="text-slate-400 flex items-center gap-1.5 text-sm">
                                    <Clock className="w-3 h-3" />
                                    Captado {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: es })}
                                </p>
                            </div>
                        </div>
                        {hasAiScoring && (
                            <div className={cn("flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-current shadow-glow-sm", scoreColor, scoreBg)}>
                                <span className="text-xs font-black uppercase tracking-tighter">AI Score</span>
                                <span className="text-2xl font-black">{score}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 gap-2 font-bold py-6">
                            <Phone className="w-4 h-4 text-emerald-500" /> WhatsApp
                        </Button>
                        <Button variant="outline" className="bg-slate-800 border-slate-700 hover:bg-slate-700 gap-2 font-bold py-6">
                            <Mail className="w-4 h-4 text-sky-500" /> Enviar Email
                        </Button>
                    </div>
                </div>

                <div className="p-6">
                    <Tabs defaultValue="info" className="w-full">
                        <TabsList className="bg-slate-800 border-slate-700 p-1 w-full grid grid-cols-3 mb-6">
                            <TabsTrigger value="info" className="data-[state=active]:bg-slate-900 data-[state=active]:text-brand-orange font-bold">Detalle</TabsTrigger>
                            <TabsTrigger value="history" className="data-[state=active]:bg-slate-900 data-[state=active]:text-brand-orange font-bold">Historial</TabsTrigger>
                            <TabsTrigger value="ai" className="data-[state=active]:bg-slate-900 data-[state=active]:text-brand-orange font-bold">AI Insight</TabsTrigger>
                        </TabsList>

                        <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Contact Info */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <User className="w-3 h-3" /> Información de Contacto
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-500 mb-1">EMAIL</p>
                                        <p className="font-bold flex items-center gap-2">{lead.email || "No provisto"}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-500 mb-1">TELÉFONO</p>
                                        <p className="font-bold flex items-center gap-2">{lead.telefono || "No provisto"}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-xs text-slate-500 mb-1">ORIGEN</p>
                                        <Badge className="bg-brand-orange text-white font-black">{lead.canalOrigen || lead.origen}</Badge>
                                    </div>
                                </div>
                            </section>

                            {/* Stage Management */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Zap className="w-3 h-3" /> Estado en Pipeline
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {etapas.map((etapa) => (
                                        <button
                                            key={etapa.id}
                                            onClick={() => handleStageChange(etapa.id)}
                                            disabled={isUpdating}
                                            className={cn(
                                                "p-3 rounded-lg border-2 text-left transition-all relative overflow-hidden group",
                                                (lead.etapaId === etapa.id)
                                                    ? "border-brand-orange bg-brand-orange/10"
                                                    : "border-slate-800 bg-slate-900 hover:border-slate-600"
                                            )}
                                        >
                                            <span
                                                className="absolute left-0 top-0 bottom-0 w-1"
                                                style={{ backgroundColor: etapa.color }}
                                            />
                                            <p className={cn(
                                                "text-xs font-bold",
                                                (lead.etapaId === etapa.id) ? "text-brand-orange" : "text-slate-400"
                                            )}>
                                                {etapa.nombre}
                                            </p>
                                            {(lead.etapaId === etapa.id) && (
                                                <CheckCircle2 className="w-4 h-4 text-brand-orange absolute right-2 top-1/2 -translate-y-1/2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Project Info */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Proyecto de Interés
                                </h3>
                                <Card className="p-4 bg-slate-900 border-slate-800 flex justify-between items-center group cursor-pointer hover:border-slate-600 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center text-white">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{lead.proyecto?.nombre || "Interés General"}</p>
                                            <p className="text-xs text-slate-500">ID: {lead.proyectoId || "N/A"}</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-brand-orange" />
                                </Card>
                            </section>
                            {/* Convert to Oportunidad */}
                            {lead.proyectoId && lead.estado !== "EN_PROCESO" && lead.estado !== "CONVERTIDO" && (
                                <section>
                                    <Button
                                        onClick={handleConvert}
                                        disabled={isConverting}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {isConverting ? "Convirtiendo..." : "Convertir a Oportunidad"}
                                    </Button>
                                </section>
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="space-y-6 animate-in fade-in duration-300">
                            <div className="relative border-l-2 border-slate-800 ml-3 space-y-8 pb-4">
                                <div className="relative pl-8">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-brand-orange border-4 border-slate-900" />
                                    <p className="text-xs font-bold text-slate-500 uppercase">Hoy</p>
                                    <div className="mt-2 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-sm font-bold text-white">Lead visualizado</p>
                                        <p className="text-xs text-slate-500 mt-1">Visto por última vez hace unos segundos</p>
                                    </div>
                                </div>
                                <div className="relative pl-8">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-700 border-4 border-slate-900" />
                                    <p className="text-xs font-bold text-slate-500 uppercase">Ayer</p>
                                    <div className="mt-2 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
                                        <p className="text-sm font-bold text-white">Cambio de Etapa</p>
                                        <p className="text-xs text-slate-500 mt-1">Movido a {lead.etapa?.nombre || "Nuevo"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> Agregar Nota
                                </h3>
                                <div className="space-y-2">
                                    <Textarea
                                        placeholder="Escribe una actualización sobre el contacto..."
                                        className="bg-slate-800 border-slate-700 min-h-[100px]"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                    <Button
                                        className="w-full bg-brand-orange hover:bg-brand-600 text-white font-bold"
                                        disabled={isSavingNote || !note.trim()}
                                        onClick={async () => {
                                            setIsSavingNote(true);
                                            const res = await addLeadNote(lead.id, note.trim());
                                            setIsSavingNote(false);
                                            if (res.success) {
                                                toast.success("Nota guardada");
                                                setNote("");
                                            } else {
                                                toast.error(res.error || "Error al guardar nota");
                                            }
                                        }}
                                    >
                                        {isSavingNote ? "Guardando..." : "Guardar Nota"}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="ai" className="space-y-6 animate-in fade-in duration-300">
                            {hasAiScoring ? (
                                <div className="space-y-6">
                                    <div className="bg-brand-orange/5 border-2 border-brand-orange/20 p-6 rounded-2xl relative overflow-hidden">
                                        <Zap className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-brand-orange/5" />
                                        <h3 className="text-xl font-black text-brand-orange mb-4 flex items-center gap-2">
                                            Resumen Predictivo
                                        </h3>
                                        <p className="text-slate-300 leading-relaxed italic">
                                            "Este prospecto muestra una alta intención de compra basada en su canal de origen y rapidez de respuesta. Se recomienda contactar vía WhatsApp en las próximas 2 horas."
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Factores de conversión</h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                                                <span className="text-sm font-medium">Interés en proyecto premium</span>
                                                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-black">+15%</Badge>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                                                <span className="text-sm font-medium">Historial de navegación</span>
                                                <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-black">+10%</Badge>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-slate-800">
                                                <span className="text-sm font-medium">Ubicación geográfica activa</span>
                                                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 font-black">+5%</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
                                        <Zap className="w-10 h-10 text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">AI Scoring No Disponible</h3>
                                        <p className="text-slate-400 max-w-xs mx-auto text-sm mt-2">
                                            Mejora tu plan para obtener predicciones inteligentes sobre la conversión de tus leads.
                                        </p>
                                    </div>
                                    <Button className="gradient-brand shadow-glow text-white font-bold">Ver Planes</Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}
