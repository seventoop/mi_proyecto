"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, BrainCircuit, Activity, CheckCircle2, AlertTriangle, TrendingUp, Zap, Users, MessageSquare } from "lucide-react";
import { getTenantAnalyticsData } from "@/lib/actions/logictoop-analytics";
import { Badge } from "@/components/ui/badge";

export function AutomationAnalyticsDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await getTenantAnalyticsData();
            if (res.success) {
                setStats(res.data);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) {
        return <div className="text-center p-12 italic uppercase font-black text-brand-500 animate-pulse">Analizando rendimiento...</div>;
    }

    if (!stats) {
        return <div className="text-center p-12 italic uppercase font-black text-rose-500">Error al cargar analíticas</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                <LineChart className="w-6 h-6 text-brand-500" />
                Inteligencia de <span className="text-brand-500">Automatización</span>
            </h2>

            {stats.warnings && stats.warnings.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex flex-col gap-2">
                    {stats.warnings.map((w: string, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-amber-500 text-[11px] font-bold uppercase italic">
                            <AlertTriangle className="w-4 h-4" /> {w}
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Commercial Impact */}
                <Card className="glass-card border-white/5 md:col-span-3">
                    <CardHeader className="pb-2 border-b border-white/5 mb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> Retorno e Impacto Comercial
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Users className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500">Leads Procesados (IA)</p>
                                <p className="text-3xl font-black italic tracking-tighter text-white">{stats.performanceStats.leadsProcessedByAutomation}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><CheckCircle2 className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500">Auto-Asignados</p>
                                <p className="text-3xl font-black italic tracking-tighter text-white">{stats.performanceStats.leadsAssignedByAutomation}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl">
                            <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500"><Zap className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-500">T. Respuesta Promedio</p>
                                <div className="flex items-end gap-1">
                                    <p className="text-3xl font-black italic tracking-tighter text-brand-500">{stats.performanceStats.averageLeadResponseTimeSeconds}</p>
                                    <span className="text-sm font-bold text-slate-500 mb-1 italic">seg</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* AI specific metrics */}
                <Card className="glass-card border-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-purple-500" /> Consumo IA
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Ejecuciones IA</p>
                            <p className="text-2xl font-black italic tracking-tighter text-white">{stats.aiStats.aiExecutions}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/20 p-2 rounded-lg">
                                <p className="text-[9px] font-bold uppercase text-slate-500">Tokens</p>
                                <p className="text-sm font-black italic text-brand-500">{stats.aiStats.tokensUsed.toLocaleString()}</p>
                            </div>
                            <div className="bg-black/20 p-2 rounded-lg">
                                <p className="text-[9px] font-bold uppercase text-slate-500">Costo Est.</p>
                                <p className="text-sm font-black italic text-rose-500">${stats.aiStats.estimatedCost}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Flows */}
                <Card className="glass-card border-white/5 md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-brand-500" /> Flujos más activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topFlows.length === 0 ? (
                            <div className="text-[10px] font-bold uppercase text-slate-500 text-center py-4">Sin datos de ejecución</div>
                        ) : (
                            <div className="space-y-3">
                                {stats.topFlows.map((flow: any, i: number) => (
                                    <div key={flow.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <span className="text-sm font-black italic uppercase tracking-tighter text-slate-200">{i+1}. {flow.nombre}</span>
                                        <Badge variant="outline" className="text-[10px] border-brand-500/30 text-brand-500 font-bold tracking-widest">
                                            {flow.executions} ejecuciones
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
