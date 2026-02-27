"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Building2, Trees, CircleDollarSign, Ruler, ArrowRight, Filter, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Simplified search logic (client-side for demo, usually server action)
// In a real prod app, this would be a server action with pagination and DB filters.
const MOCK_PROJECTS = [
    { id: "1", nombre: "La Reserva", ubicacion: "Cardales", tipo: "URBANIZACION" },
    { id: "2", nombre: "Sky Tower", ubicacion: "Canning", tipo: "EDIFICIO" }
];

export default function GlobalSearchPage() {
    const [search, setSearch] = useState("");
    const [type, setType] = useState("TODOS");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    // Simulate search
    return (
        <main className="min-h-screen bg-slate-950 pt-24 pb-20">
            <div className="max-w-7xl mx-auto px-6">
                {/* Search Header */}
                <div className="mb-12 space-y-8">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4 leading-tight">
                            Encuentra tu <span className="text-brand-500">Oportunidad</span> Ideal.
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Busca en todo nuestro inventario de lotes, departamentos y locales comerciales en tiempo real.
                        </p>
                    </div>

                    {/* Integrated Search Bar */}
                    <div className="p-6 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-md shadow-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar por lote, proyecto o ciudad..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 transition-all font-medium"
                                />
                            </div>
                            <div className="relative">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full pl-12 pr-6 py-4 bg-black/40 border border-white/10 rounded-2xl text-white appearance-none cursor-pointer focus:outline-none focus:border-brand-500/50 transition-all font-medium"
                                >
                                    <option value="TODOS">Todos los Tipos</option>
                                    <option value="LOTE">Lotes / Terrenos</option>
                                    <option value="DEPARTAMENTO">Departamentos</option>
                                    <option value="LOCAL">Locales</option>
                                </select>
                            </div>
                            <button className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2">
                                <Search className="w-5 h-5" />
                                Buscar Ahora
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Filters */}
                    <aside className="lg:col-span-1 space-y-8">
                        <div>
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Filter className="w-4 h-4 text-brand-500" />
                                Filtros Avanzados
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Presupuesto (USD)</label>
                                    <div className="flex gap-3">
                                        <input type="number" placeholder="Min" className="w-1/2 p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50" />
                                        <input type="number" placeholder="Max" className="w-1/2 p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/50" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-black uppercase text-slate-500 tracking-widest">Ubicación</label>
                                    <div className="space-y-2">
                                        {["Buenos Aires", "Cordoba", "Costa Atlántica"].map(city => (
                                            <label key={city} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="w-5 h-5 rounded border border-white/20 group-hover:border-brand-500 transition-colors bg-white/5 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-brand-500 opacity-0 group-aria-checked:opacity-100" />
                                                </div>
                                                <span className="text-slate-400 group-hover:text-white transition-colors text-sm">{city}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA Widget */}
                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-earth-700 to-earth-900 border border-white/10 shadow-xl space-y-4">
                            <h4 className="text-xl font-bold text-white">¿No encuentras lo que buscas?</h4>
                            <p className="text-white/70 text-sm leading-relaxed">
                                Déjanos tus datos y un asesor se contactará para ofrecerte oportunidades exclusivas en fase pre-lanzamiento.
                            </p>
                            <Link href="/contacto" className="w-full block py-3 bg-white text-earth-900 rounded-xl text-center font-bold text-sm hover:scale-105 transition-transform">
                                Contactar Asesor
                            </Link>
                        </div>
                    </aside>

                    {/* Results Area */}
                    <div className="lg:col-span-3 space-y-8">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-500 text-sm font-medium">Mostrando <span className="text-white">12</span> resultados de 148 unidades</p>
                            <div className="flex items-center gap-4 text-sm font-bold">
                                <span className="text-slate-500">Ordenar por:</span>
                                <select className="bg-transparent text-white border-none focus:ring-0 cursor-pointer">
                                    <option>Más recientes</option>
                                    <option>Menor precio</option>
                                    <option>Mayor superficie</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Result Card Example */}
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-brand-500/50 transition-all">
                                    <div className="relative h-64">
                                        <img
                                            src={`https://images.unsplash.com/photo-1542332213-915993de7e76?q=80&w=2070&auto=format&fit=crop`}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            alt="Unidad"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <div className="absolute top-4 left-4 p-3 bg-brand-500/20 backdrop-blur-md rounded-2xl border border-brand-500/30">
                                            <Trees className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <div className="absolute bottom-6 left-8">
                                            <h3 className="text-2xl font-black text-white">Lote N° {i * 12}</h3>
                                            <p className="text-slate-300 text-sm flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-brand-500" />
                                                Proyecto La Reserva, Cardales
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Superficie</p>
                                                <div className="flex items-center gap-2">
                                                    <Ruler className="w-4 h-4 text-brand-500" />
                                                    <span className="text-white font-bold">{300 + i * 20}m²</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Precio</p>
                                                <div className="flex items-center gap-2">
                                                    <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-white font-bold">USD {(25000 + i * 5000).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <hr className="border-white/5" />
                                        <div className="flex items-center justify-between">
                                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-xs font-black uppercase">Disponible</span>
                                            <Link href="/proyectos/la-reserva" className="inline-flex items-center gap-2 text-sm font-bold text-white hover:text-brand-500 transition-colors">
                                                Ver Detalle <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
