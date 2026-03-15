import { cn } from "@/lib/utils";

interface UsageMeterProps {
    resource: string;
    current: number;
    limit: number;
    label: string;
    className?: string;
}

export default function UsageMeter({ resource, current, limit, label, className }: UsageMeterProps) {
    const isUnlimited = limit === -1 || limit === null || limit === undefined;
    const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

    let colorClass = "bg-emerald-500";
    if (percentage > 90) colorClass = "bg-rose-500";
    else if (percentage > 70) colorClass = "bg-amber-500";

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-slate-500">
                <span>{label}</span>
                <span className={cn(percentage >= 100 && !isUnlimited ? "text-rose-500" : "text-slate-400")}>
                    {current} / {isUnlimited ? "∞" : limit}
                </span>
            </div>

            {!isUnlimited && (
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        className={cn("h-full transition-all duration-500", colorClass)}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
}
