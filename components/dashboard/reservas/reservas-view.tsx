"use client";

import ReservaDialog from "./reserva-dialog";
import ReservasTable from "./reservas-table";

interface ReservasViewProps {
    reservas: any[];
    leads: any[];
    unidades: any[];
}

export default function ReservasView({ reservas, leads, unidades }: ReservasViewProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gestión de Reservas</h1>
                    <p className="text-slate-400 mt-1">Administra y aprueba las reservas de unidades</p>
                </div>

                <ReservaDialog leads={leads} unidades={unidades} />
            </div>

            <ReservasTable reservas={reservas} />
        </div>
    );
}
