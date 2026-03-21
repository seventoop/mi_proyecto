"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Building2, Search, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { getOrganizationsList } from "@/lib/actions/admin-actions";
import { cn } from "@/lib/utils";

interface Org {
    id: string;
    nombre: string;
}

export default function AdminOrgSelector({ 
    title = "Seleccionar Organización",
    description = "Selecciona una organización para gestionar sus datos.",
    error
}: { 
    title?: string;
    description?: string;
    error?: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchOrgs = async () => {
            setLoading(true);
            const res = await getOrganizationsList();
            if (res.success) {
                setOrgs(res.data || []);
            }
            setLoading(false);
        };
        fetchOrgs();
    }, []);

    const handleSelect = (orgId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("orgId", orgId);
        router.push(`${pathname}?${params.toString()}`);
    };

    const filteredOrgs = orgs.filter(org => 
        org.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 animate-fade-in">
            <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-[100px] -z-10 group-hover:bg-brand-500/20 transition-all duration-700" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10 group-hover:bg-emerald-500/20 transition-all duration-700" />

                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-3xl bg-brand-500/10 text-brand-500 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Building2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white mb-3">
                        {title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">
                        {description}
                    </p>
                    
                    {error && (
                        <div className="mt-6 flex items-center justify-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold uppercase italic">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="BUSCAR ORGANIZACIÓN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold uppercase tracking-wider focus:outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-600"
                    />
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Sincronizando nodos...</p>
                        </div>
                    ) : filteredOrgs.length > 0 ? (
                        filteredOrgs.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => handleSelect(org.id)}
                                className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[1.25rem] hover:bg-brand-500/10 hover:border-brand-500/30 transition-all group/item overflow-hidden relative"
                            >
                                <div className="relative z-10">
                                    <span className="text-lg font-black tracking-tighter uppercase italic text-slate-900 dark:text-white group-hover/item:text-brand-500 transition-colors">
                                        {org.nombre}
                                    </span>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-500 group-hover/item:text-brand-500 group-hover/item:translate-x-1 transition-all relative z-10" />
                                
                                <div className="absolute top-0 right-0 bottom-0 w-1 bg-brand-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-sm font-bold text-slate-500 uppercase italic">No se encontraron organizaciones para "{searchTerm}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
