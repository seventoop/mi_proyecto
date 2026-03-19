"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import LeadDetailDrawer from "./lead-detail-drawer";
import { useState } from "react";

const STATUS_COLORS: Record<string, string> = {
    "NUEVO": "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "CONTACTADO": "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "INTERESADO": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "VISITA": "bg-pink-500/10 text-pink-500 border-pink-500/20",
    "RESERVA": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    "PERDIDO": "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function LeadsTable({
    leads,
    planFeatures = [],
    etapas = []
}: {
    leads: any[],
    planFeatures?: string[],
    etapas?: any[]
}) {
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const hasAiScoring = planFeatures.includes("ai_scoring");

    const openLead = (lead: any) => {
        setSelectedLead(lead);
        setIsDrawerOpen(true);
    };

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm dark:shadow-none">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/[0.01]">
                    <TableRow className="border-slate-100 dark:border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Nombre</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Contacto</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Proyecto</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Estado</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4 text-center">Score AI</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Asignado</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Fecha</TableHead>
                        <TableHead className="w-[50px] py-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => {
                        const score = lead.score || 0;
                        const scoreColor = score > 70 ? "text-rose-500 bg-rose-500/10" : score > 40 ? "text-amber-500 bg-amber-500/10" : "text-blue-500 bg-blue-500/10";

                        return (
                            <TableRow
                                key={lead.id}
                                className="border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.03] cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group"
                                onClick={() => openLead(lead)}
                            >
                                <TableCell className="py-4">
                                    <span className="text-[14px] font-black text-slate-900 dark:text-zinc-100 group-hover:text-brand-500 transition-colors uppercase tracking-tight">
                                        {lead.nombre}
                                    </span>
                                </TableCell>
                                <TableCell className="py-4">
                                    <div className="space-y-1">
                                        {lead.email && (
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-tight">
                                                <Mail className="w-3 h-3 text-slate-400 dark:text-white/20" /> {lead.email}
                                            </div>
                                        )}
                                        {lead.telefono && (
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-tight">
                                                <Phone className="w-3 h-3 text-slate-400 dark:text-white/20" /> {lead.telefono}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-[12px] font-bold text-slate-600 dark:text-zinc-400 py-4 uppercase tracking-tighter italic">
                                    {lead.proyecto?.nombre || "General"}
                                </TableCell>
                                <TableCell className="py-4">
                                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter border shadow-sm", STATUS_COLORS[lead.estado] || "bg-slate-500/10 text-slate-400 border-slate-500/20")}>
                                        {lead.estado}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center py-4">
                                    {hasAiScoring ? (
                                        <div className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-black border", scoreColor)}>
                                            {score}
                                        </div>
                                    ) : (
                                        <div className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-black border border-slate-200 dark:border-white/10 text-slate-300 dark:text-white/10">
                                            —
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="py-4">
                                    {lead.asignadoA ? (
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="w-6 h-6 border border-slate-100 dark:border-white/10 shadow-sm">
                                                <AvatarImage src={lead.asignadoA.avatar} />
                                                <AvatarFallback className="text-[9px] font-black bg-brand-500/10 text-brand-500">{lead.asignadoA.nombre.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-tight">{lead.asignadoA.nombre}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-white/10 uppercase tracking-widest italic">Sin asignar</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-tight py-4">
                                    {format(new Date(lead.createdAt), "dd MMM, yyyy", { locale: es })}
                                </TableCell>
                                <TableCell className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1.5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-white/20 hover:text-brand-500 dark:hover:bg-white/[0.06] transition-colors">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] shadow-xl">
                                                <DropdownMenuItem onClick={() => openLead(lead)} className="text-[11px] font-bold uppercase tracking-widest py-2 dark:hover:bg-white/[0.04] cursor-pointer">Ver Detalles</DropdownMenuItem>
                                                <DropdownMenuItem className="text-[11px] font-bold uppercase tracking-widest py-2 dark:hover:bg-white/[0.04] cursor-pointer">Editar</DropdownMenuItem>
                                                <DropdownMenuItem className="text-[11px] font-bold uppercase tracking-widest py-2 text-rose-500 dark:hover:bg-white/[0.04] cursor-pointer">Eliminar</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {leads.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={8} className="h-32 text-center">
                                <p className="text-[12px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest italic">No se encontraron leads.</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <LeadDetailDrawer
                lead={selectedLead}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                etapas={etapas}
                hasAiScoring={hasAiScoring}
            />
        </div>
    );
}
