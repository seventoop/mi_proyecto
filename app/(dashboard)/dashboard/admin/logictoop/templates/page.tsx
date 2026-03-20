import { db } from "@/lib/db";
import { requireAuth } from "@/lib/guards";
import { TemplateCard } from "./components/TemplateCard";
import { Package, Search, Filter, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { seedInitialTemplates, getTemplates } from "@/lib/actions/logictoop-templates";

export default async function TemplatesPage() {
    const user = await requireAuth();
    
    // Fetch all organizations so admin can pick where to install
    const orgs = await db.organization.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" }
    });

    if (orgs.length === 0) return <div>No se encontraron organizaciones.</div>;
    const defaultOrg = orgs[0];

    // Auto-seed on first visit if empty
    let templates = await getTemplates();
    if (templates.length === 0) {
        await seedInitialTemplates();
        templates = await getTemplates();
    }

    const categories = Array.from(new Set(templates.map((t: any) => t.category)));

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3 italic uppercase">
                        <Package className="w-8 h-8 text-brand-600 not-italic" />
                        Marketplace <span className="text-brand-600">Workflows</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-wide">
                        Biblioteca de plantillas de automatización listas para usar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/admin/logictoop">
                        <Button variant="outline" className="text-xs font-bold uppercase italic">
                            Volver a Flujos
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Filters */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 italic">
                            <Filter className="w-3 h-3 not-italic" />
                            Categorías
                        </h3>
                        <div className="space-y-1">
                            <button className="w-full text-left px-3 py-2 rounded-lg bg-brand-50 text-brand-700 font-bold text-xs uppercase italic transition-all border border-brand-100">
                                Todas las plantillas
                            </button>
                            {categories.map((cat: any) => (
                                <button key={cat} className="w-full text-left px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 font-bold text-xs uppercase italic transition-all">
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-brand-900 rounded-xl p-6 text-white overflow-hidden relative shadow-xl">
                        <Sparkles className="absolute -top-4 -right-4 w-24 h-24 text-brand-700/50 rotate-12" />
                        <h4 className="font-black text-lg italic uppercase leading-tight relative z-10">
                            ¿Necesitás algo <span className="text-brand-400">custom?</span>
                        </h4>
                        <p className="text-brand-100 text-xs mt-2 relative z-10 leading-relaxed font-medium">
                            Nuestro equipo puede diseñar flujos avanzados para tu organización.
                        </p>
                        <Button className="mt-4 w-full bg-white text-brand-950 hover:bg-brand-100 font-black italic uppercase text-xs py-1 h-8 tracking-widest relative z-10 border-none">
                            Contactar Soporte
                        </Button>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="md:col-span-3 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template: any) => (
                            <TemplateCard key={template.id} template={template} orgId={defaultOrg.id} />
                        ))}
                    </div>

                    {templates.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center px-4">
                            <Package className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="font-bold text-slate-800 uppercase italic">No se encontraron plantillas</h3>
                            <p className="text-slate-500 text-sm max-w-xs mt-2">
                                Estamos actualizando la biblioteca. Volvé a visitarnos pronto.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
