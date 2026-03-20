"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend
} from "recharts";
import { Card } from "@/components/ui/card";
import {
    TrendingUp,
    Users,
    Target,
    Zap,
    BarChart3,
    PieChart as PieChartIcon,
    Calendar
} from "lucide-react";

const STAGE_LABELS: Record<string, string> = {
    NUEVO: "Nuevo",
    CONTACTADO: "Contactado",
    INTERESADO: "Interesado",
    EN_PROCESO: "En proceso",
    VISITA: "Visita",
    RESERVA: "Reservado",
    PERDIDO: "Perdido",
    CONVERTIDO: "Convertido",
};

export default function CrmMetricsClient({ metrics }: { metrics: any }) {
    const stageData = metrics.leadsByStage.map((s: any) => ({
        name: STAGE_LABELS[s.estado] ?? s.estado,
        value: s._count
    }));

    const channelData = metrics.leadsByChannel.map((c: any) => ({
        name: c.canalOrigen || "Desconocido",
        value: c._count
    }));

    // Mock data based on real counts for better visual if real history is sparse
    const COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#64748b'];

    return (
        <div className="space-y-6">

            {/* Matrix Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.12] transition-colors rounded-2xl shadow-none">
                    <div className="flex items-center gap-3 text-brand-500 mb-3">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Total Leads</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.totalLeads}</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/30 tracking-widest uppercase mt-4 font-bold">{metrics.leadsThisMonth ?? 0} captados este mes</p>
                </Card>
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.12] transition-colors rounded-2xl shadow-none">
                    <div className="flex items-center gap-3 text-brand-500 mb-3">
                        <Zap className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Tasa de Conv.</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.conversionRate ?? 0}%</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/30 tracking-widest uppercase mt-4 font-bold">Leads → Oportunidades</p>
                </Card>
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.12] transition-colors rounded-2xl shadow-none">
                    <div className="flex items-center gap-3 text-brand-500 mb-3">
                        <Target className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Con Score AI</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.leadsWithScore ?? 0}</p>
                    <p className="text-[10px] text-slate-500 dark:text-white/30 tracking-widest uppercase mt-4 font-bold">Puntuación activa</p>
                </Card>
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] hover:bg-white/[0.02] hover:border-white/[0.12] transition-colors rounded-2xl shadow-none">
                    <div className="flex items-center gap-3 text-brand-500 mb-3">
                        <Calendar className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40">Captados (30d)</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.leadsThisMonth ?? metrics.leadsLast30Days?.length ?? 0}</p>
                    <p className="text-[10px] text-brand-500/80 tracking-widest uppercase mt-4 font-bold">
                        {metrics.topStage ? `Etapa top: ${metrics.topStage}` : "Actividad detectada"}
                    </p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Stage Distribution */}
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] rounded-2xl shadow-none">
                    <h3 className="text-[11px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-brand-500" /> Distribución por Etapa
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 900 }} />
                                <YAxis stroke="#64748b" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.4)', fontWeight: 900 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#0A0A0C', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '16px' }}
                                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Channel Distribution */}
                <Card className="p-6 bg-[#0A0A0C] border-white/[0.06] rounded-2xl shadow-none">
                    <h3 className="text-[11px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-brand-500" /> Origen de Captación
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {channelData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0A0A0C', borderColor: 'rgba(255,255,255,0.06)', borderRadius: '16px' }}
                                    itemStyle={{ color: '#fff', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase' }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
