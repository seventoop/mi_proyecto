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
            "relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/[0.07] dark:bg-amber-500/[0.05] animate-in fade-in slide-in-from-top-4 duration-300",
            className
        )}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3.5">
                <div className="flex items-center gap-3.5 text-center md:text-left">
                    <div className="p-2 rounded-lg bg-amber-500/15 shrink-0">
                        <ArrowUpCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest leading-none mb-0.5">Capacidad al límite</p>
                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-500/80">
                            Usaste el <span className="font-black">{percentage.toFixed(0)}%</span> de tus {resource}. Actualizá tu plan para seguir creciendo.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg text-[10px] uppercase tracking-wider px-4 py-1 h-7 shadow-sm shadow-amber-500/20">
                        <Link href="/dashboard/developer/planes">
                            Mejorar Plan
                        </Link>
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors text-amber-500/60 hover:text-amber-500"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
