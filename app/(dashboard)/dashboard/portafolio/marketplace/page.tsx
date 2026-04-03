import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInvestmentOpportunities } from "@/lib/actions/investor-actions";
import { Building2 } from "lucide-react";
import InvestorProjectCard from "@/components/dashboard/inversor/investor-project-card";

export default async function PortafolioMarketplacePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    if (!["CLIENTE", "INVERSOR", "ADMIN", "SUPERADMIN"].includes(role)) redirect("/dashboard");

    const proyectos = await getInvestmentOpportunities();

    return (
        <div className="space-y-6 animate-fade-in w-full pb-10 p-6">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">Marketplace de Inversiones</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Oportunidades de inversión en etapa temprana con protección Escrow</p>
            </div>

            {proyectos.length === 0 ? (
                <div className="glass-card p-16 text-center border-dashed border-2">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No hay proyectos disponibles</h3>
                    <p className="text-slate-500 text-sm">Próximamente habrá nuevas oportunidades de inversión.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {proyectos.map((proyecto: any) => (
                        <InvestorProjectCard
                            key={proyecto.id}
                            proyecto={proyecto}
                            showFavorite={role === "INVERSOR" || role === "ADMIN"}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
