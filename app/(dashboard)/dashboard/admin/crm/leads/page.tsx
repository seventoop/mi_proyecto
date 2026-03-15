"use client";

import { useState, useEffect } from "react";
import {
    Users, Search, Filter, Mail, Phone,
    Calendar, Building, UserPlus,
    CheckCircle2, AlertCircle, MessageCircle
} from "lucide-react";
import { getAdminLeads, assignLeadToOrg } from "@/lib/actions/crm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import {
    Sheet, SheetContent, SheetDescription,
    SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function AdminLeadsInbox() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<any[]>([]);

    const fetchLeads = async () => {
        setLoading(true);
        const res = await getAdminLeads();
        if (res.success) {
            setLeads(res.data?.leads || []);
            setOrgs(res.data?.orgs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const handleAssign = async (leadId: string, orgId: string) => {
        const res = await assignLeadToOrg(leadId, orgId);
        if (res.success) {
            toast.success("Lead asignado correctamente");
            fetchLeads();
        } else {
            toast.error("Error al asignar");
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                        Bandeja <span className="text-brand-500 underline decoration-4">Sin Asignar</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                        Leads Inbound (Meta, TikTok, Webhooks) esperando destino
                    </p>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-white/10">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10">
                            <TableHead className="text-[10px] font-black uppercase text-slate-400">Lead</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400">Canal</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400">Fecha</TableHead>
                            <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 italic text-slate-500">Cargando leads...</TableCell></TableRow>
                        ) : leads.map((lead) => (
                            <TableRow key={lead.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-slate-900 dark:text-white uppercase italic tracking-tighter">{lead.nombre}</span>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                            <Mail className="w-2.5 h-2.5" /> {lead.email || "S/E"}
                                            <span className="text-white/10">|</span>
                                            <Phone className="w-2.5 h-2.5" /> {lead.telefono || "S/T"}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={cn(
                                        "text-[9px] font-black uppercase italic tracking-tighter",
                                        lead.canalOrigen === "FACEBOOK" ? "border-blue-500/30 text-blue-500" :
                                            lead.canalOrigen === "TIKTOK" ? "border-rose-500/30 text-rose-500" :
                                                "border-emerald-500/30 text-emerald-500"
                                    )}>
                                        {lead.canalOrigen}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-[10px] font-bold text-slate-500">
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="ghost" size="sm" className="bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 font-black uppercase italic text-[10px] tracking-tighter">
                                                Asignar Orga
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent className="dark:bg-[#111116] border-white/10">
                                            <SheetHeader>
                                                <SheetTitle className="text-2xl font-black uppercase italic tracking-tighter">Asignar a <span className="text-brand-500">Organización</span></SheetTitle>
                                                <SheetDescription className="text-slate-500 font-bold uppercase text-[10px]">
                                                    Selecciona el destino para {lead.nombre}
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="mt-8 space-y-3">
                                                {orgs.map((org) => (
                                                    <button
                                                        key={org.id}
                                                        onClick={() => handleAssign(lead.id, org.id)}
                                                        className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-500/30 hover:bg-brand-500/5 transition-all text-left"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-100 uppercase italic tracking-tighter">{org.nombre}</p>
                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{org._count.proyectos} Proyectos Activos</p>
                                                        </div>
                                                        <UserPlus className="w-4 h-4 text-brand-500" />
                                                    </button>
                                                ))}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && leads.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center py-12 italic text-slate-500">No hay leads pendientes en la bandeja global</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
