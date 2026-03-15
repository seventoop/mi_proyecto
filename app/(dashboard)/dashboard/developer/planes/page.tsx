import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrgPlanWithUsage, getAvailablePlans } from "@/lib/actions/plan-actions";
import { redirect } from "next/navigation";
import { Check, X, Shield, Zap, Star, Trophy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import PlanBadge from "@/components/saas/PlanBadge";

export default async function PlanesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const orgId = (session.user as any).orgId;
    const [currentPlanRes, allPlansRes] = await Promise.all([
        getOrgPlanWithUsage(orgId),
        getAvailablePlans()
    ]);

    const currentPlan = currentPlanRes.success ? currentPlanRes.data : null;
    const plans = allPlansRes.success && allPlansRes.data ? allPlansRes.data : [];

    const getIcon = (planName: string) => {
        switch (planName.toUpperCase()) {
            case 'FREE': return <Shield className="w-8 h-8 text-slate-400" />;
            case 'BASIC': return <Zap className="w-8 h-8 text-blue-400" />;
            case 'PRO': return <Star className="w-8 h-8 text-amber-400" />;
            case 'ENTERPRISE': return <Trophy className="w-8 h-8 text-purple-400" />;
            default: return <Zap className="w-8 h-8 text-blue-400" />;
        }
    };

    return (
        <div className="space-y-8 p-6 animate-fade-in max-w-7xl mx-auto">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl gradient-text">
                    Planes y Límites
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                    Gestiona tu suscripción y amplía las capacidades de tu organización.
                </p>
            </div>

            {currentPlan && (
                <Card className="p-8 bg-slate-900/50 border-slate-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
                            Plan Activo
                        </Badge>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-xl group-hover:scale-105 transition-transform">
                            {getIcon(currentPlan.planName)}
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                <h2 className="text-3xl font-bold text-white uppercase tracking-wider">{currentPlan.planName}</h2>
                                <PlanBadge plan={currentPlan.planName as any} />
                            </div>
                            <p className="text-slate-400">Tu organización está actualmente en el plan {currentPlan.planName}.</p>
                        </div>
                        <div className="w-full md:w-auto grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Leads</p>
                                <p className="text-xl font-bold text-white">
                                    {currentPlan.usage.leads.current} / {currentPlan.usage.leads.limit === 9999 ? '∞' : currentPlan.usage.leads.limit}
                                </p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                <p className="text-xs text-slate-500 uppercase font-black tracking-widest mb-1">Proyectos</p>
                                <p className="text-xl font-bold text-white">
                                    {currentPlan.usage.proyectos.current} / {currentPlan.usage.proyectos.limit === 9999 ? '∞' : currentPlan.usage.proyectos.limit}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan: any) => (
                    <Card key={plan.id} className={`p-6 bg-slate-900 border-slate-800 flex flex-col h-full relative transition-all hover:border-slate-700 hover:shadow-2xl ${plan.nombre === currentPlan?.planName ? 'ring-2 ring-brand-500 border-brand-500' : ''}`}>
                        <div className="mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700">
                                    {getIcon(plan.nombre)}
                                </div>
                                {plan.nombre === 'PRO' && (
                                    <Badge className="bg-brand-500 text-white border-0">Popular</Badge>
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">{plan.nombre}</h3>
                            <div className="flex items-baseline gap-1 mt-4">
                                <span className="text-4xl font-extrabold text-white">${plan.precio}</span>
                                <span className="text-slate-500 text-sm">/mes</span>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1 mb-8">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2 border-b border-slate-800 pb-2">Incluye:</p>
                            <FeatureItem label="CRM Completo" included={plan.features.crm} />
                            <FeatureItem label="AI Lead Scoring" included={plan.features.ai_scoring} />
                            <FeatureItem label="Importación de Leads" included={plan.features.importacion_leads} />
                            <FeatureItem label="Tours 360" included={plan.features.tour360} />
                            <FeatureItem label="Masterplan Interactivo" included={plan.features.masterplan} />
                            <div className="mt-4 pt-4 border-t border-slate-800">
                                <p className="text-sm text-slate-300 flex justify-between">
                                    <span>Límite de Leads:</span>
                                    <span className="font-bold">{plan.limites.maxLeads === 9999 ? 'Ilimitado' : plan.limites.maxLeads}</span>
                                </p>
                                <p className="text-sm text-slate-300 flex justify-between mt-1">
                                    <span>Límite de Proyectos:</span>
                                    <span className="font-bold">{plan.limites.maxProyectos === 9999 ? 'Ilimitado' : plan.limites.maxProyectos}</span>
                                </p>
                            </div>
                        </div>

                        {plan.nombre === currentPlan?.planName ? (
                            <Button className="w-full bg-slate-800 text-slate-400 cursor-default hover:bg-slate-800" disabled>
                                Plan Actual
                            </Button>
                        ) : (
                            <Button className="w-full gradient-brand text-white shadow-glow hover:shadow-glow-lg">
                                Contactar Ventas <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </Card>
                ))}
            </div>

            <Card className="p-8 bg-indigo-950/20 border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-white">¿Necesitas un plan personalizado?</h3>
                    <p className="text-slate-400">Si tu organización requiere más límites o funcionalidades específicas, nuestro equipo te ayudará a diseñar el plan perfecto.</p>
                </div>
                <Button variant="outline" className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 px-8 py-6 h-auto text-lg font-bold">
                    Hablar con un Asesor
                </Button>
            </Card>
        </div>
    );
}

function FeatureItem({ label, included }: { label: string, included: boolean }) {
    return (
        <div className={`flex items-center gap-3 text-sm ${included ? 'text-slate-300' : 'text-slate-600'}`}>
            {included ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>
            ) : (
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-slate-700" />
                </div>
            )}
            <span className={included ? '' : 'line-through decoration-slate-700'}>{label}</span>
        </div>
    );
}
