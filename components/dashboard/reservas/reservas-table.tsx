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
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, MoreHorizontal } from "lucide-react";
import { approveReserva, cancelReserva } from "@/lib/actions/reservas";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<string, { color: string, label: string }> = {
    "PENDIENTE_APROBACION": { color: "bg-amber-500/20 text-amber-400", label: "Pendiente" },
    "ACTIVA": { color: "bg-emerald-500/20 text-emerald-400", label: "Activa" },
    "CANCELADA": { color: "bg-rose-500/20 text-rose-400", label: "Cancelada" },
    "COMPLETADA": { color: "bg-blue-500/20 text-blue-400", label: "Completada" },
};

export default function ReservasTable({ reservas }: { reservas: any[] }) {

    const handleApprove = async (id: string) => {
        const res = await approveReserva(id);
        if (res.success) {
            toast.success("Reserva aprobada y unidad bloqueada");
        } else {
            toast.error("Error al aprobar reserva");
        }
    };

    const handleCancel = async (id: string) => {
        const res = await cancelReserva(id);
        if (res.success) {
            toast.success("Reserva cancelada y unidad liberada");
        } else {
            toast.error("Error al cancelar reserva");
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden shadow-sm dark:shadow-none">
            <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/[0.01]">
                    <TableRow className="border-slate-100 dark:border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Unidad / Proyecto</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Cliente (Lead)</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Vencimiento</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Seña</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4">Estado</TableHead>
                        <TableHead className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest py-4 text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservas.map((reserva) => (
                        <TableRow key={reserva.id} className="border-slate-100 dark:border-white/[0.04] hover:bg-slate-50/50 dark:hover:bg-white/[0.03] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group">
                            <TableCell className="py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[13px] font-black text-slate-900 dark:text-zinc-100 group-hover:text-brand-500 transition-colors uppercase tracking-tight">{reserva.unidad}</span>
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-tighter">{reserva.proyecto}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{reserva.lead}</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-white/30 uppercase tracking-widest">{reserva.leadEmail}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight py-4">
                                {format(new Date(reserva.fechaVencimiento), "dd MMM yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 py-4">
                                {reserva.montoSena ? `$${reserva.montoSena.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="py-4">
                                <Badge variant="outline" className={`border-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm ${STATUS_CONFIG[reserva.estado]?.color || "bg-slate-500/10 text-slate-400"}`}>
                                    {STATUS_CONFIG[reserva.estado]?.label || reserva.estado}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right py-4">
                                <div className="flex justify-end gap-2">
                                    {reserva.estado === "PENDIENTE_APROBACION" && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                onClick={() => handleApprove(reserva.id)}
                                                title="Aprobar"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                                onClick={() => handleCancel(reserva.id)}
                                                title="Rechazar"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </>
                                    )}
                                    {reserva.estado === "ACTIVA" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                            onClick={() => handleCancel(reserva.id)}
                                            title="Cancelar"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-slate-200">
                                            <DropdownMenuItem>Ver Detalles Completos</DropdownMenuItem>
                                            <DropdownMenuItem>Generar Comprobante</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {reservas.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center">
                                <p className="text-[12px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest">No hay reservas registradas.</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
