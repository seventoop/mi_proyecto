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
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-900/50">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead>Unidad / Proyecto</TableHead>
                        <TableHead>Cliente (Lead)</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Seña</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservas.map((reserva) => (
                        <TableRow key={reserva.id} className="border-slate-800 hover:bg-slate-800/50">
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium text-white">{reserva.unidad}</span>
                                    <span className="text-xs text-slate-400">{reserva.proyecto}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="text-slate-200">{reserva.lead}</span>
                                    <span className="text-xs text-slate-400">{reserva.leadEmail}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                                {format(new Date(reserva.fechaVencimiento), "dd MMM yyyy", { locale: es })}
                            </TableCell>
                            <TableCell className="font-mono text-slate-300">
                                {reserva.montoSena ? `$${reserva.montoSena.toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className={`border-0 ${STATUS_CONFIG[reserva.estado]?.color || "bg-slate-700"}`}>
                                    {STATUS_CONFIG[reserva.estado]?.label || reserva.estado}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
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
                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                No hay reservas registradas.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
