"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, History, XCircle, Users } from "lucide-react";
import { getObservabilityStats } from "@/lib/actions/logictoop-ops";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function ObservabilityDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await getObservabilityStats();
            if (res.success) {
                setStats(res.data);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) {
        return <div className="text-center p-12 italic uppercase font-black text-brand-500 animate-pulse">Cargando métricas...</div>;
    }

    if (!stats) {
        return <div className="text-center p-12 italic uppercase font-black text-rose-500">Error al cargar métricas</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                <Activity className="w-6 h-6 text-brand-500" />
                Observabilidad <span className="text-brand-500 border border-brand-500 bg-brand-500/10 px-2 py-0.5 rounded text-xs tracking-widest ml-2">ESTADO GLOBAL</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass-card border-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <History className="w-4 h-4 text-brand-500" /> Total Ejecu.
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black italic tracking-tighter text-white">{stats.totalExecutions}</div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" /> Success Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black italic tracking-tighter text-emerald-500">{stats.successRate}%</div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-rose-500" /> Fallos Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black italic tracking-tighter text-rose-500">{stats.failedExecutions}</div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Users className="w-4 h-4 text-brand-500" /> Orgs Activas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black italic tracking-tighter text-white">{stats.executionsByOrg?.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <Card className="glass-card border-white/5">
                    <CardHeader>
                        <CardTitle className="text-md font-black uppercase italic tracking-tighter flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" /> Fallos Recientes
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Ejecuciones fallidas o reintentando</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats.recentFailures?.length === 0 ? (
                            <div className="text-center text-sm font-black uppercase italic text-emerald-500/50 py-8 border border-dashed border-white/5 rounded-xl">
                                Ningún fallo reportado recientemente.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {stats.recentFailures.map((exec: any) => (
                                    <div key={exec.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg flex flex-col gap-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-300">ID: {exec.id.slice(0, 8)}</span>
                                            <Badge variant="destructive" className="italic text-xs uppercase font-black">{exec.status}</Badge>
                                        </div>
                                        <div className="text-xs text-slate-400 col-span-2 capitalize"><strong className="uppercase">Flow:</strong> {exec.flow?.nombre} ({exec.flow?.org?.nombre})</div>
                                        <div className="mt-2 text-xs text-rose-400 font-mono bg-rose-950/20 p-2 rounded truncate" title={exec.errorMessage}>
                                            {exec.errorMessage || "Error desconocido"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/5">
                    <CardHeader>
                        <CardTitle className="text-md font-black uppercase italic tracking-tighter flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-500" /> Consumo por Organización
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest">Top 10 orgs por volumen de ejecución</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/5">
                                    <TableHead className="text-xs font-black uppercase text-slate-400">Organización</TableHead>
                                    <TableHead className="text-xs font-black uppercase text-slate-400 text-right">Ejecuciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.executionsByOrg?.map((org: any, i: number) => (
                                    <TableRow key={i} className="border-white/5">
                                        <TableCell className="font-bold text-xs uppercase tracking-tighter text-slate-300">{org.nombre}</TableCell>
                                        <TableCell className="text-right text-brand-500 font-black italic">{org.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
