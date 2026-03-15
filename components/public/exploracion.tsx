"use client";

import { useState } from "react";
import { Search, MapPin, Home, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/language-provider";

export default function Exploracion() {
    const router = useRouter();
    const { dictionary: t } = useLanguage();
    const [filtros, setFiltros] = useState({
        provincia: "",
        ciudad: "",
        zona: "",
        tipo: "",
        precio: ""
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (filtros.provincia) params.set("provincia", filtros.provincia);
        if (filtros.ciudad) params.set("ciudad", filtros.ciudad);
        if (filtros.zona) params.set("zona", filtros.zona);
        if (filtros.tipo) params.set("tipo", filtros.tipo);
        if (filtros.precio) params.set("precio", filtros.precio);

        router.push(`/proyectos?${params.toString()}`);
    };

    return (
        <section className="relative -mt-16 z-20 pb-12 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-6 sm:p-8 shadow-2xl">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                        {t.search.title}
                    </h2>

                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row flex-wrap gap-4 items-end justify-center">

                        {/* Provincia */}
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t.search.provinceLabel}</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5" />
                                <select
                                    className="w-full bg-background border border-border text-foreground pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none appearance-none"
                                    value={filtros.provincia}
                                    onChange={(e) => setFiltros({ ...filtros, provincia: e.target.value })}
                                >
                                    <option value="">{t.search.provinceAll}</option>
                                    <option value="Buenos Aires">Buenos Aires</option>
                                    <option value="CABA">{t.search.provinceCaba}</option>
                                    <option value="Cordoba">Córdoba</option>
                                    <option value="Santa Fe">Santa Fe</option>
                                </select>
                            </div>
                        </div>

                        {/* Ciudad */}
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t.search.cityLabel}</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder={t.search.cityPlaceholder}
                                    className="w-full bg-background border border-border text-foreground pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none"
                                    value={filtros.ciudad}
                                    onChange={(e) => setFiltros({ ...filtros, ciudad: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Zona */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t.search.zoneLabel}</label>
                            <select
                                className="w-full bg-background border border-border text-foreground px-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none appearance-none"
                                value={filtros.zona}
                                onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })}
                            >
                                <option value="">{t.search.zoneAny}</option>
                                <option value="Norte">{t.search.zoneNorth}</option>
                                <option value="Sur">{t.search.zoneSouth}</option>
                                <option value="Este">{t.search.zoneEast}</option>
                                <option value="Oeste">{t.search.zoneWest}</option>
                                <option value="Centro">{t.search.zoneCenter}</option>
                            </select>
                        </div>

                        {/* Tipo de Proyecto */}
                        <div className="flex-1 min-w-[160px]">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t.search.typeLabel}</label>
                            <div className="relative">
                                <Home className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5" />
                                <select
                                    className="w-full bg-black/40 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none appearance-none"
                                    value={filtros.tipo}
                                    onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                                >
                                    <option value="">{t.search.typeAny}</option>
                                    <option value="URBANIZACION">{t.search.typeUrbanization}</option>
                                    <option value="BARRIO_PRIVADO">{t.search.typePrivateNeighborhood}</option>
                                    <option value="EDIFICIO">{t.search.typeBuilding}</option>
                                    <option value="CONDOMINIO">{t.search.typeCondo}</option>
                                </select>
                            </div>
                        </div>

                        {/* Rango de Precio */}
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{t.search.priceLabel}</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 w-5 h-5" />
                                <select
                                    className="w-full bg-black/40 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-orange outline-none appearance-none"
                                    value={filtros.precio}
                                    onChange={(e) => setFiltros({ ...filtros, precio: e.target.value })}
                                >
                                    <option value="">{t.search.priceRange}</option>
                                    <option value="0-50k">{t.search.priceUpTo50}</option>
                                    <option value="50k-100k">{t.search.price50to100}</option>
                                    <option value="100k+">{t.search.priceOver100}</option>
                                </select>
                            </div>
                        </div>

                        {/* Search Button */}
                        <div className="w-full md:w-auto mt-4 md:mt-0">
                            <button
                                type="submit"
                                className="w-full md:w-auto bg-brand-orange hover:bg-brand-orangeDark text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-glow hover:scale-105 active:scale-95"
                            >
                                <Search className="w-5 h-5" />
                                <span className="md:hidden lg:inline">{t.search.submitButton}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}
