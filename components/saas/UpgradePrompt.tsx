"use client";

import { useState } from "react";
import { ArrowUpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
    resource: string;
    percentage: number;
    className?: string;
}

export default function UpgradePrompt({ resource, percentage, className }: UpgradePromptProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible || percentage < 90) return null;

    return (
        <div className={cn(
            "relative overflow-hidden bg-brand-orange text-white p-4 rounded-2xl shadow-lg border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500",
            className
        )}>
            {/* Background patterns */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-24 h-24 bg-black/10 rounded-full blur-xl" />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                        <ArrowUpCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-tighter italic">¡Capacidad al límite!</h4>
                        <p className="text-xs font-bold opacity-90">
                            Has usado el <span className="underline decoration-2">{percentage.toFixed(0)}%</span> de tus {resource}.
                            Actualiza tu plan para seguir creciendo sin límites.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button asChild className="bg-white text-brand-orange hover:bg-white/90 font-black rounded-xl uppercase italic text-[10px] px-6 py-1 h-8">
                        <Link href="/dashboard/developer/planes">
                            Mejorar Plan
                        </Link>
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
