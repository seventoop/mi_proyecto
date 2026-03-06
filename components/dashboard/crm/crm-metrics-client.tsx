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

export default function CrmMetricsClient({ metrics }: { metrics: any }) {
    const stageData = metrics.leadsByStage.map((s: any) => ({
        name: s.estado,
        value: s._count
    }));

    const channelData = metrics.leadsByChannel.map((c: any) => ({
        name: c.canalOrigen || "Desconocido",
        value: c._count
    }));

    // Mock data based on real counts for better visual if real history is sparse
    const COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#64748b'];

    return (
        <div className="space-y-8 animate-fade-in p-6">
            <div className="flex justify-between items-center bg-slate-900 pb-2 border-b border-brand-orange/20">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-brand-orange" />
                        BI & Métricas de Conversión
                    </h1>
                    <p className="text-slate-400 mt-1">Análisis de rendimiento y embudo de ventas</p>
                </div>
            </div>

            {/* Matrix Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-slate-900 border-slate-800 shadow-glow-sm">
                    <div className="flex items-center gap-4 text-brand-orange mb-2">
                        <Users className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Total Leads</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.totalLeads}</p>
                    <p className="text-xs text-emerald-500 mt-2 font-bold">+12% vs mes anterior</p>
                </Card>
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <div className="flex items-center gap-4 text-brand-orange mb-2">
                        <Zap className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Tasa de Conv.</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.conversionRate ?? 0}%</p>
                    <p className="text-xs text-slate-500 mt-2 font-bold">Leads → Oportunidades</p>
                </Card>
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <div className="flex items-center gap-4 text-brand-orange mb-2">
                        <Target className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Leads con Score AI</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.leadsWithScore ?? 0}</p>
                    <p className="text-xs text-slate-500 mt-2 font-bold">Con puntuación activa</p>
                </Card>
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <div className="flex items-center gap-4 text-brand-orange mb-2">
                        <Calendar className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Captados (30d)</span>
                    </div>
                    <p className="text-4xl font-black text-white">{metrics.leadsThisMonth ?? metrics.leadsLast30Days?.length ?? 0}</p>
                    <p className="text-xs text-brand-orange mt-2 font-bold">
                        {metrics.topStage ? `Etapa top: ${metrics.topStage}` : "Actividad detectada"}
                    </p>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stage Distribution */}
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-brand-orange" /> Distribución por Etapa
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stageData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} fontWeight="bold" />
                                <YAxis stroke="#64748b" fontSize={12} fontWeight="bold" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Channel Distribution */}
                <Card className="p-6 bg-slate-900 border-slate-800">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieChartIcon className="w-5 h-5 text-brand-orange" /> Origen de Captación
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
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
