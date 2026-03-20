"use client";

import { useState } from "react";
import InvestmentCheckout from "./investment-checkout";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface InvestmentContainerProps {
    oportunidades: any[];
    kycStatus: string;
}

export default function InvestmentContainer({ oportunidades, kycStatus }: InvestmentContainerProps) {
    const [selectedProyecto, setSelectedProyecto] = useState<any | null>(null);
    const router = useRouter();

    const handleInvest = (op: any) => {
        if (kycStatus !== "VERIFICADO") {
            toast.error("Debes completar tu verificación KYC antes de invertir.", {
                action: {
                    label: "Completar",
                    onClick: () => router.push("/dashboard/inversor/mi-perfil/kyc")
                }
            });
            return;
        }
        setSelectedProyecto(op);
    };

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {oportunidades.map((op) => (
                    <div key={op.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300">
                        {/* Component code handled by parent page.tsx simplified for the trigger */}
                        <div className="p-6">
                            <h3 className="font-bold text-lg mb-2">{op.nombre}</h3>
                            <div className="mb-4 text-sm text-slate-500">
                                <p>Rendimiento Estimado: {op.roiEstimado || "15%"} anual</p>
                                <p>Min. Inversión: ${op.minInversion || "1,000"}</p>
                            </div>
                            <button
                                onClick={() => handleInvest(op)}
                                className={cn(
                                    "w-full py-4 rounded-2xl font-black transition-all shadow-lg",
                                    kycStatus === "VERIFICADO"
                                        ? "bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700"
                                )}
                            >
                                {kycStatus === "VERIFICADO" ? `Invertir en ${op.nombre}` : "KYC Requerido"}
                            </button>
                            {kycStatus !== "VERIFICADO" && (
                                <p className="text-xs text-amber-600 dark:text-amber-500 font-bold mt-2 text-center uppercase tracking-widest animate-pulse">
                                    Verifica tu cuenta para habilitar inversiones
                                </p>
                            )}
                        </div>
                    </div>
                ))}
                {oportunidades.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No hay oportunidades abiertas en este momento.
                    </div>
                )}
            </div>

            {selectedProyecto && (
                <InvestmentCheckout
                    proyecto={selectedProyecto}
                    onClose={() => setSelectedProyecto(null)}
                />
            )}
        </>
    );
}

