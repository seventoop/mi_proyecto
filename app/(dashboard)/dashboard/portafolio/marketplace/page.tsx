import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllPublicProjects } from "@/lib/actions/investor-actions";
import { Building2, Sparkles } from "lucide-react";
import MarketplaceExplorer from "@/components/dashboard/inversor/marketplace-explorer";

export default async function PortafolioMarketplacePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const role = (session.user as any).role as string;
    if (!["CLIENTE", "INVERSOR", "ADMIN", "SUPERADMIN", "VENDEDOR", "DESARROLLADOR"].includes(role)) {
        redirect("/dashboard");
    }

    const proyectos = await getAllPublicProjects();

    return (
        <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10 p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-brand-500" />
                        <span className="text-xs font-black uppercase tracking-widest text-brand-500">SevenToop</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        Proyectos disponibles
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                        Explorá todos los desarrollos inmobiliarios publicados en la plataforma
                    </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20">
                    <Building2 className="w-4 h-4 text-brand-500" />
                    <span className="text-sm font-bold text-brand-500">
                        {proyectos.length} {proyectos.length === 1 ? "proyecto" : "proyectos"}
                    </span>
                </div>
            </div>

            <MarketplaceExplorer proyectos={proyectos} userRole={role} />
        </div>
    );
}
