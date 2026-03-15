import { cn } from "@/lib/utils";
import { ShieldCheck, Star, Zap, Crown } from "lucide-react";

type PlanType = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

interface PlanBadgeProps {
    plan: string;
    className?: string;
}

export default function PlanBadge({ plan, className }: PlanBadgeProps) {
    const planUpper = plan.toUpperCase() as PlanType;

    const configs: Record<PlanType, { color: string, icon: any, label: string }> = {
        FREE: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: ShieldCheck, label: "Free" },
        BASIC: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Zap, label: "Basic" },
        PRO: { color: "bg-brand-orange/10 text-brand-orange border-brand-orange/20", icon: Star, label: "Pro" },
        ENTERPRISE: { color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Crown, label: "Enterprise" },
    };

    const config = configs[planUpper] || configs.FREE;
    const Icon = config.icon;

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-tighter",
            config.color,
            className
        )}>
            <Icon className="w-3 h-3" />
            {config.label}
        </div>
    );
}
