import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { getInversorDashboardData, getInvestmentOpportunities } from "@/lib/actions/investor-actions";
import PortafolioDashboardClient from "./portafolio-dashboard-client";

export const dynamic = "force-dynamic";

export default async function PortafolioDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    const userId = session.user.id as string;

    // Only CLIENTE, INVERSOR, ADMIN/SUPERADMIN
    if (!["CLIENTE", "INVERSOR", "ADMIN", "SUPERADMIN"].includes(role)) {
        redirect("/dashboard");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            nombre: true,
            email: true,
            kycStatus: true,
            riskLevel: true,
            rol: true,
        }
    });

    if (!user) redirect("/login");

    // Check for pending inversor KYC request
    const kycProfile = await (prisma as any).kycProfile.findUnique({
        where: { userId },
        select: { tipo: true, estado: true }
    });

    const inversorKycStatus = kycProfile?.tipo === "INVERSOR" ? kycProfile.estado : null;

    // Mis unidades como cliente (propiedades físicas)
    const misUnidades = await prisma.unidad.findMany({
        where: { responsableId: userId },
        include: {
            manzana: {
                include: {
                    etapa: {
                        include: { proyecto: true }
                    }
                }
            }
        },
        orderBy: { updatedAt: "desc" },
        take: 5
    });

    // Portafolio inversor (solo si tiene el rol)
    let inversorData = null;
    let oportunidades: any[] = [];

    if (role === "INVERSOR" || role === "ADMIN" || role === "SUPERADMIN") {
        inversorData = await getInversorDashboardData(userId);
        oportunidades = await getInvestmentOpportunities();
    }

    return (
        <PortafolioDashboardClient
            user={user}
            role={role}
            misUnidades={misUnidades as any}
            inversorData={inversorData as any}
            oportunidades={oportunidades as any}
            inversorKycStatus={inversorKycStatus}
        />
    );
}
