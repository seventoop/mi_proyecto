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
            <div className="flex justify-end items-center mb-2">
                <ReservaDialog leads={leads} unidades={unidades} />
            </div>

            <ReservasTable reservas={reservas} />
        </div>
    );
}
