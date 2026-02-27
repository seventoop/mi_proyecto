"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, CheckCircle, XCircle, MoreVertical, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cancelarReserva, confirmarVenta } from "@/lib/actions/reservas";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface ReservasListProps {
    reservas: any[];
    userRole: string;
}

export default function ReservasList({ reservas, userRole }: ReservasListProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleCancelar = async (id: string) => {
        if (!confirm("¿Seguro que deseas cancelar esta reserva? La unidad volverá a estar disponible.")) return;

        setIsLoading(id);
        const res = await cancelarReserva(id);
        setIsLoading(null);

        if (res.success) {
            toast.success("Reserva cancelada");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleConfirmarVenta = async (id: string, precio: number) => {
        // En un flujo real, esto pediría confirmar el precio final en un modal
        if (!confirm("¿Confirmar venta y marcar unidad como VENDIDA?")) return;

        setIsLoading(id);
        const res = await confirmarVenta({ reservaId: id, precioFinal: precio });
        setIsLoading(null);

        if (res.success) {
            toast.success("Venta concretada exitosamente");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    if (reservas.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <CalendarClock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400">No hay reservas activas</h3>
                <p className="text-sm text-slate-400">Las reservas realizadas aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-brand-500" />
                Reservas y Ventas
            </h2>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4">Cliente (Lead)</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Vencimiento</th>
                                <th className="px-6 py-4">Seña</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {reservas.map((reserva) => (
                                <tr key={reserva.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {reserva.unidad.numero}
                                        <div className="text-xs text-slate-500 mt-0.5">{reserva.unidad.tipo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium">{reserva.lead?.nombre || "Sin nombre"}</div>
                                        <div className="text-xs text-slate-500">{reserva.lead?.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                            reserva.estado === "ACTIVA" && "bg-orange-100 text-orange-600",
                                            reserva.estado === "CANCELADA" && "bg-red-100 text-red-600",
                                            reserva.estado === "CONCRETADA" && "bg-green-100 text-green-600"
                                        )}>
                                            {reserva.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                        {reserva.estado === "ACTIVA"
                                            ? format(new Date(reserva.fechaVencimiento), "dd MMM yyyy", { locale: es })
                                            : "—"
                                        }
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {reserva.montoSena ? formatCurrency(reserva.montoSena) : "—"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {reserva.estado === "ACTIVA" ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isLoading === reserva.id}>
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Gestionar Reserva</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleConfirmarVenta(reserva.id, reserva.unidad.precio)}
                                                        className="text-green-600 font-medium"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Concretar Venta
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleCancelar(reserva.id)}
                                                        className="text-red-600 font-medium"
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" />
                                                        Cancelar Reserva
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Cerrada</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
