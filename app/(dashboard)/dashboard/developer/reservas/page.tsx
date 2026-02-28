import { getReservas } from "@/lib/actions/reservas";
import ReservasView from "@/components/dashboard/reservas/reservas-view";
import { getLeads } from "@/lib/actions/leads";
import { getAllUnidades } from "@/lib/actions/unidades";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ReservasPage() {
    const session = await getServerSession(authOptions);

    // Parallel data fetching
    const [reservasRes, leadsRes, unidadesRes] = await Promise.all([
        getReservas(),
        getLeads(),
        getAllUnidades({ estado: "DISPONIBLE", creadoPorId: session?.user?.id })
    ]);

    const reservas = reservasRes.success && "reservas" in reservasRes.data ? reservasRes.data.reservas : [];
    const leads = leadsRes.success && "leads" in leadsRes.data ? leadsRes.data.leads : [];
    const unidades = unidadesRes.success ? unidadesRes.data : [];

    return (
        <div className="p-6 animate-fade-in">
            <ReservasView
                reservas={reservas as any[]}
                leads={leads as any[]}
                unidades={unidades as any[]}
            />
        </div>
    );
}
