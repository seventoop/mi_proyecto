import { getReservas } from "@/lib/actions/reservas";
import ReservasView from "@/components/dashboard/reservas/reservas-view";
import { getLeads } from "@/lib/actions/leads";
import { getAllUnidades } from "@/lib/actions/unidades";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ReservasPage() {
    // Parallel data fetching
    const [reservasRes, leadsRes, unidadesRes] = await Promise.all([
        getReservas(),
        getLeads(),
        getAllUnidades({ estado: "DISPONIBLE", creadoPorId: (await getServerSession(authOptions))?.user?.id })
    ]);

    return (
        <div className="p-6 animate-fade-in">
            <ReservasView
                reservas={reservasRes.data?.reservas || []}
                leads={leadsRes.data || []}
                unidades={unidadesRes.data || []}
            />
        </div>
    );
}
