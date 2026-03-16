import prisma from "@/lib/db";
import ProjectsListClient from "@/components/dashboard/proyectos/projects-list-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { KycDemoStatusCard } from "@/components/dashboard/kyc-demo-status-card";

export default async function ProyectosPage() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    // Fetch developer-specific projects from DB
    const proyectos = await prisma.proyecto.findMany({
        where: { creadoPorId: userId },
        include: {
            etapas: {
                include: {
                    manzanas: {
                        include: {
                            unidades: true
                        }
                    }
                }
            },
            _count: {
                select: { leads: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    // Process projects to get unit stats
    const processedProyectos = proyectos.map(p => {
        let total = 0;
        let disponibles = 0;
        let reservadas = 0;
        let vendidas = 0;

        p.etapas.forEach(etapa => {
            etapa.manzanas.forEach(manzana => {
                manzana.unidades.forEach(u => {
                    total++;
                    if (u.estado === "DISPONIBLE") disponibles++;
                    if (u.estado === "RESERVADA") reservadas++;
                    if (u.estado === "VENDIDA") vendidas++;
                });
            });
        });

        return {
            ...p,
            unidades: { total, disponibles, reservadas, vendidas },
            leadsCount: p._count.leads
        };
    });

    // Fetch developer KYC status using raw query to bypass Prisma Client sync issues
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, riskLevel: true, demoEndsAt: true, demoUsed: true }
    });
    const kycStatus = user?.kycStatus;

    return (
        <div className="space-y-6">
            <KycDemoStatusCard
                kycStatus={(kycStatus as any) || "PENDIENTE"}
                demoEndsAt={user?.demoEndsAt || null}
                demoUsed={user?.demoUsed || false}
            />
            <ProjectsListClient
                projects={processedProyectos}
                newProjectPath={
                    (kycStatus === "VERIFICADO" || !user || !(user as any).demoUsed || ((user as any)?.demoEndsAt && new Date((user as any).demoEndsAt) > new Date()))
                        ? "/dashboard/developer/proyectos/new"
                        : undefined
                }
            />
        </div>
    );
}

