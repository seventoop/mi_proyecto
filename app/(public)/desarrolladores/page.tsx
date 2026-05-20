import { Metadata } from "next";
import DeveloperInfrastructure from "@/components/public/developer-infrastructure";
import LaunchSystem from "@/components/public/launch-system";
import ServicePlans from "@/components/public/service-plans";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRequestDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
    const dictionary = await getRequestDictionary();

    return {
        title: dictionary.developersPage.metadataTitle,
        description: dictionary.developersPage.metadataDescription,
    };
}

export default async function DevelopersPage() {
    const dictionary = await getRequestDictionary();
    const copy = dictionary.developersPage;

    return (
        <main className="min-h-screen pt-24 bg-white dark:bg-black">
            {/* Hero para Desarrolladores */}
            <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
                <div className="w-full text-center relative z-10 mx-auto max-w-5xl space-y-7">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-orange/10 border border-brand-orange/20 shadow-lg">
                        <Building2 className="w-4 h-4 text-brand-orange" />
                        <span className="bg-gradient-to-r from-brand-orange to-brand-orangeDark bg-clip-text text-transparent font-black uppercase text-xs tracking-widest">
                            {copy.badge}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
                        {copy.titlePrefix}{" "}
                        <span className="bg-gradient-to-r from-brand-orange to-brand-yellow bg-clip-text text-transparent">
                            {copy.titleHighlight}
                        </span>
                    </h1>
                    <p className="text-foreground/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                        {copy.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link
                            href="/register?role=DESARROLLADOR"
                            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-7 py-4 text-base font-black text-white shadow-2xl shadow-brand-orange/20 transition-all hover:scale-[1.02] hover:bg-brand-orangeDark active:scale-95 sm:px-10 sm:py-5 sm:text-lg"
                        >
                            {copy.primaryCta}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            href="#planes"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-orange/20 px-7 py-4 text-base font-black text-brand-orange transition-all hover:bg-brand-orange hover:text-white active:scale-95 sm:px-10 sm:py-5 sm:text-lg"
                        >
                            {copy.secondaryCta}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Infraestructura — bg: gray alt */}
            <DeveloperInfrastructure />

            {/* Sistema de Lanzamiento — bg: white/black */}
            <LaunchSystem />

            {/* Modelos de Servicio — bg: gray alt */}
            <div id="planes">
                <ServicePlans />
            </div>

            {/* CTA Final Desarrolladores */}
            <section className="relative overflow-hidden border-t border-slate-200/60 bg-white px-4 py-14 dark:border-white/5 dark:bg-black sm:px-6 sm:py-20">
                <div className="mx-auto w-full max-w-7xl rounded-[2rem] bg-gradient-to-br from-brand-orange via-brand-orangeDark to-brand-orange/80 p-8 text-center relative overflow-hidden shadow-2xl sm:rounded-[3rem] sm:p-14 md:p-20">
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                            {copy.finalTitle}
                        </h2>
                        <p className="text-white/80 text-lg max-w-xl mx-auto leading-relaxed">
                            {copy.finalDescription}
                        </p>
                        <Link
                            href="/register?role=DESARROLLADOR"
                            className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-black text-brand-900 shadow-2xl transition-all hover:scale-[1.02] active:scale-95 sm:px-12 sm:py-5 sm:text-lg"
                        >
                            {copy.finalCta}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <p className="text-white/40 text-xs font-medium max-w-lg mx-auto leading-relaxed">
                            {copy.finalNote}
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
