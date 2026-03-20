"use client";

import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Period } from "./period-selector";

export interface LeadsDayBucket {
    date: string; // "YYYY-MM-DD"
    count: number;
}

interface Props {
    data: LeadsDayBucket[]; // full 30d dataset from server
    period: Period;
}

function formatLabel(date: string) {
    const d = new Date(date + "T00:00:00");
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#09090b] border border-white/10 rounded-xl px-4 py-2.5 shadow-xl">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-lg font-black text-brand-400">{payload[0].value} leads</p>
        </div>
    );
};

export function LeadsTimeline({ data, period }: Props) {
    const displayed = useMemo(() => {
        const days = period === "7d" ? 7 : 30;
        return data.slice(-days).map(d => ({
            ...d,
            label: formatLabel(d.date),
        }));
    }, [data, period]);

    if (displayed.length === 0) {
        return (
            <div className="flex items-center justify-center h-[180px] text-white/20 text-sm font-medium">
                Sin datos para el período seleccionado
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displayed} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    interval={period === "30d" ? 4 : 0}
                />
                <YAxis
                    tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(249,115,22,0.06)" }} />
                <Bar
                    dataKey="count"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
