import { getReservas } from "@/lib/actions/reservas";
import ReservasList from "./reservas-list";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function ReservasPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedSearchParams = await searchParams;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;

    const page = Number(resolvedSearchParams?.page) || 1;
    const search = typeof resolvedSearchParams?.search === "string" ? resolvedSearchParams.search : undefined;
    const estado = typeof resolvedSearchParams?.estado === "string" ? resolvedSearchParams.estado : "ACTIVA";
    const proyecto = typeof resolvedSearchParams?.proyecto === "string" ? resolvedSearchParams.proyecto : undefined;
    const vendedor = typeof resolvedSearchParams?.vendedor === "string" ? resolvedSearchParams.vendedor : undefined;
    const estadoPago = typeof resolvedSearchParams?.estadoPago === "string" ? resolvedSearchParams.estadoPago : undefined;

    // Fetch filters and page data
    const res = await getReservas(page, 10, {
        search,
        estado,
        proyecto,
        vendedor,
        estadoPago
    });

    // Fetch counts for tabs (parallel)
    const baseWhere: any = {};
    if (userRole !== "ADMIN") baseWhere.vendedorId = userId;

    const [countActiva, countVencida, countConvertida, countCancelada] = await Promise.all([
        prisma.reserva.count({ where: { ...baseWhere, estado: "ACTIVA" } }),
        prisma.reserva.count({ where: { ...baseWhere, estado: "VENCIDA" } }),
        prisma.reserva.count({ where: { ...baseWhere, estado: "CONVERTIDA" } }),
        prisma.reserva.count({ where: { ...baseWhere, estado: "CANCELADA" } }),
    ]);

    const counts = {
        ACTIVA: countActiva,
        VENCIDA: countVencida,
        CONVERTIDA: countConvertida,
        CANCELADA: countCancelada,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                    Reservas
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Control de disponibilidad y gestión de reservas en tiempo real
                </p>
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
            }>
                <ReservasList
                    reservas={res.success ? res.data?.reservas || [] : []}
                    metadata={res.success ? res.data?.metadata || { total: 0, page: 1, totalPages: 1 } : { total: 0, page: 1, totalPages: 1 }}
                    counts={counts}
                />
            </Suspense>
        </div>
    );
}
