"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTheme } from "next-themes";

interface Props {
    disponibles: number;
    reservadas: number;
    vendidas: number;
}

const COLORS = {
    disponibles: "#10b981", // emerald
    reservadas:  "#f59e0b", // amber
    vendidas:    "#6366f1", // indigo
};

const LABELS: Record<string, string> = {
    disponibles: "Disponibles",
    reservadas:  "Reservadas",
    vendidas:    "Vendidas",
};

const CustomTooltip = ({ active, payload }: any) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    return (
        <div className="bg-white dark:bg-[#09090b] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 shadow-xl">
            <p className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-1">{LABELS[name] || name}</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{value} unidades</p>
        </div>
    );
};

const renderLegend = (props: any) => {
    const { payload } = props;
    return (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
            {payload.map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm font-semibold text-slate-500 dark:text-white/50">{LABELS[entry.value] || entry.value}</span>
                </div>
            ))}
        </div>
    );
};

export function InventoryComposition({ disponibles, reservadas, vendidas }: Props) {
    const total = disponibles + reservadas + vendidas;

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-slate-400 dark:text-white/20 text-sm font-medium">
                Sin unidades registradas
            </div>
        );
    }

    const data = [
        { name: "disponibles", value: disponibles },
        { name: "reservadas",  value: reservadas },
        { name: "vendidas",    value: vendidas },
    ].filter(d => d.value > 0);

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={52}
                    outerRadius={78}
                    paddingAngle={3}
                    strokeWidth={0}
                >
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS] ?? "#6b7280"} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
            </PieChart>
        </ResponsiveContainer>
    );
}
