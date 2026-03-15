"use client";

import { ReactNode } from "react";
import { Lock, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeatureGateProps {
    feature: string;
    children: ReactNode;
    fallback?: ReactNode;
    features?: string[]; // List of enabled features from plan
    max?: number;      // Maximum limit for resource
    current?: number;  // Current usage for resource
    showUpgradeCard?: boolean;
}

export default function FeatureGate({
    feature,
    children,
    fallback,
    features,
    max,
    current,
    showUpgradeCard = true
}: FeatureGateProps) {
    let isAllowed = true;

    // 1. Check feature flags (string list)
    if (features && !features.includes(feature)) {
        isAllowed = false;
    }

    // 2. Check resource limits (numeric)
    if (max !== undefined && current !== undefined && max !== 0) {
        if (current >= max && max !== 9999) { // 9999 = unlimited
            isAllowed = false;
        }
    }

    if (isAllowed) return <>{children}</>;

    if (!showUpgradeCard) {
        // Just disable children or show simple lock
        return (
            <div className="relative group cursor-not-allowed">
                <div className="opacity-50 pointer-events-none grayscale">
                    {children}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-slate-900 border border-slate-700 p-1 rounded-full shadow-xl">
                        <Lock className="w-3 h-3 text-brand-orange" />
                    </div>
                </div>
            </div>
        );
    }

    return fallback || <LockCard feature={feature} />;
}

function LockCard({ feature }: { feature: string }) {
    const featureLabels: Record<string, string> = {
        ai_scoring: "AI Lead Scoring",
        importacion_leads: "Importación Masiva",
        tour360: "Tour 360",
        masterplan: "Masterplan Interactivo",
        automations: "Automatizaciones Avanzadas",
        leads: "Límite de Leads Alcanzado",
        proyectos: "Límite de Proyectos Alcanzado"
    };

    const label = featureLabels[feature] || feature;

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-white/10 rounded-2xl text-center space-y-4 backdrop-blur-sm">
            <div className="p-3 bg-brand-orange/10 rounded-full">
                <Lock className="w-8 h-8 text-brand-orange" />
            </div>
            <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Función Bloqueada</h3>
                <p className="text-sm text-slate-400 font-medium max-w-[250px] mt-1">
                    La función <span className="text-brand-400 font-bold">{label}</span> requiere un plan superior o has alcanzado tu límite.
                </p>
            </div>
            <Button asChild className="bg-brand-orange hover:bg-brand-orange/90 text-white font-black rounded-xl gap-2 uppercase italic text-xs px-6">
                <Link href="/dashboard/developer/planes">
                    <ArrowUpCircle className="w-4 h-4" />
                    Mejorar Plan
                </Link>
            </Button>
        </div>
    );
}
