import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInversorFavoritos } from "@/lib/actions/investor-actions";
import { BookmarkCheck } from "lucide-react";
import InvestorProjectCard from "@/components/dashboard/inversor/investor-project-card";
import Link from "next/link";

export default async function PortafolioFavoritosPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const res = await getInversorFavoritos();
    const favoritos = res.success ? (res as any).data : [];

    return (
        <div className="space-y-6 animate-fade-in w-full pb-10 p-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                        <BookmarkCheck className="w-8 h-8 text-brand-500" /> Mi Watchlist
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Proyectos que estás siguiendo de cerca</p>
                </div>
                <Link href="/dashboard/portafolio/marketplace" className="text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors flex items-center gap-2">
                    Explorar más proyectos →
                </Link>
            </div>

            {favoritos.length === 0 ? (
                <div className="glass-card p-20 text-center border-dashed border-2 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-6">
                        <BookmarkCheck className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Tu watchlist está vacía</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                        Guarda los proyectos que te interesen para hacerles un seguimiento.
                    </p>
                    <Link href="/dashboard/portafolio/marketplace" className="px-8 py-4 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 transition-all">
                        Ir al Marketplace
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {favoritos.map((proyecto: any) => (
                        <InvestorProjectCard key={proyecto.id} proyecto={proyecto} showFavorite={true} />
                    ))}
                </div>
            )}
        </div>
    );
}
