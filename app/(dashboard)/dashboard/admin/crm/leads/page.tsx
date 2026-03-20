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
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";
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
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminCrmLeads} />
                </div>
            </div>

            <div className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-white/[0.02] border-b border-white/[0.06]">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-xs uppercase text-slate-500 font-black tracking-widest h-11">Lead</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500 font-black tracking-widest h-11">Canal</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500 font-black tracking-widest h-11">Fecha</TableHead>
                            <TableHead className="text-xs uppercase text-slate-500 font-black tracking-widest h-11 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-[12px] font-black uppercase tracking-widest text-slate-500 border-b border-white/[0.04]">Cargando leads...</TableCell></TableRow>
                        ) : leads.map((lead) => (
                            <TableRow key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <TableCell className="py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-[12px] text-slate-900 dark:text-white uppercase tracking-tight">{lead.nombre}</span>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                            <Mail className="w-3 h-3" /> {lead.email || "S/E"}
                                            <span className="text-white/[0.06]">•</span>
                                            <Phone className="w-3 h-3" /> {lead.telefono || "S/T"}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-widest border border-white/[0.06]",
                                        lead.canalOrigen === "FACEBOOK" ? "text-blue-500 bg-blue-500/10" :
                                            lead.canalOrigen === "TIKTOK" ? "text-rose-500 bg-rose-500/10" :
                                                "text-emerald-500 bg-emerald-500/10"
                                    )}>
                                        {lead.canalOrigen}
                                    </span>
                                </TableCell>
                                <TableCell className="py-4 text-xs font-black uppercase tracking-widest text-slate-500">
                                    {new Date(lead.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="py-4 text-right">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="ghost" size="sm" className="bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors rounded-lg px-4">
                                                Asignar Orga
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent className="bg-white dark:bg-[#0A0A0C] border-l-white/[0.06] sm:max-w-md w-full p-6">
                                            <SheetHeader className="text-left mb-6">
                                                <SheetTitle className="text-[18px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">Asignar <span className="text-brand-500">Organización</span></SheetTitle>
                                                <SheetDescription className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">
                                                    Selecciona el destino para {lead.nombre}
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="mt-8 space-y-3">
                                                {orgs.map((org) => (
                                                    <button
                                                        key={org.id}
                                                        onClick={() => handleAssign(lead.id, org.id)}
                                                        className="w-full flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/[0.06] hover:border-brand-500/50 hover:bg-brand-500/10 transition-all text-left group"
                                                    >
                                                        <div>
                                                            <p className="font-black text-[13px] text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-brand-500 transition-colors">{org.nombre}</p>
                                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{org._count.proyectos} Proyectos Activos</p>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-brand-500/20 flex items-center justify-center transition-colors">
                                                            <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-brand-500 transition-colors" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!loading && leads.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center py-12 text-[12px] font-black uppercase tracking-widest text-slate-500 border-b border-white/[0.04]">No hay leads pendientes en la bandeja global</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
