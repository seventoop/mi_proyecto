import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getInversorDashboardData, getInvestmentOpportunities } from "@/lib/actions/investor-actions";
import { TrendingUp, Wallet, ShieldCheck, BarChart3, ArrowUpRight, Clock, MapPin, Building2, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { RiskBadge } from "@/components/dashboard/risk-badge";
import { getFundingProgress } from "@/lib/investment-engine";
import { cn } from "@/lib/utils";

import ActivityCenter from "@/components/dashboard/activity-center";
import InvestorFinancialSummary from "@/components/dashboard/investor-financial-summary";
import InvestorMovementsTable from "@/components/dashboard/investor-movements-table";
import InvestmentContainer from "@/components/dashboard/inversor/investment-container";

import prisma from "@/lib/db";

export default async function InversorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // ✅ Role gate: only INVERSOR (or ADMIN) can access this dashboard
  const role = (session.user as any).role || (session.user as any).rol;
  if (role !== "INVERSOR" && role !== "ADMIN") redirect("/dashboard");

  const data = (await getInversorDashboardData(session.user.id as string)) as any;
  const { inversiones, stats, movimientos, nextMilestone, distribution } = data;
  const oportunidades = await getInvestmentOpportunities();

  // Fetch KYC and Risk Status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycStatus: true, riskLevel: true },
  });
  const kycStatus = user?.kycStatus || "PENDIENTE";

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Panel de Inversor</h1>
            <RiskBadge level={user?.riskLevel || "medium"} />
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión de portafolio y oportunidades de fondeo mayorista.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-bold flex items-center gap-2 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            Fondos Protegidos en Escrow
          </div>
          {kycStatus !== "VERIFICADO" && (
            <Link
              href="/dashboard/inversor/mi-perfil/kyc"
              className="px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-500/20 hover:bg-amber-500/20 transition-colors animate-pulse"
            >
              <AlertCircle className="w-4 h-4" />
              Completar KYC
            </Link>
          )}
        </div>
      </div>

      {/* Financial Module */}
      <InvestorFinancialSummary stats={stats as any} distribution={distribution} nextMilestone={nextMilestone} />

      {/* Stats Cards (Secondary) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-earth-500/10 rounded-lg">
              <Building2 className="w-5 h-5 text-earth-600" />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-500">M² Totales</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalM2} m²</div>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">Distribuidos en {inversiones.length} proyectos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-brand-500">
          <p className="text-sm font-black uppercase tracking-tight">Potencial Escrow</p>
          <p className="text-2xl font-black">${stats.totalInvertido.toLocaleString()}</p>
          <p className="text-[10px] opacity-70 font-bold">Capital en resguardo</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
              ROI Promedio <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.roiPromedio}%</div>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">Rendimiento sobre costo</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-earth-500">
          <p className="text-sm font-black uppercase tracking-tight">Valor de Cartera</p>
          <p className="text-2xl font-black">${stats.valorActual.toLocaleString()}</p>
          <p className="text-[10px] opacity-70 font-bold">Precio mercado hoy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Portfolio & Movements */}
        <div className="lg:col-span-2 space-y-8">
          {/* Activity Center */}
          <ActivityCenter
            userRole="INVERSOR"
            activities={[
              { id: "1", type: "INVESTMENT", title: "Dividendos acreditados", description: "+$1,200 por plusvalía Edificio Sur.", date: new Date(), status: "success" },
              { id: "2", type: "PROJECT", title: "Nuevo Proyecto", description: "Oportunidad con ROI 18% disponible.", date: new Date(Date.now() - 7200000), status: "info" },
            ]}
          />

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Mi Portafolio
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-600 dark:text-slate-500">
                {inversiones.length}
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {(inversiones as any[]).map((inv: any) => (
              <div key={inv.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
                      <Image src={inv.proyecto.imagenPortada || ""} alt={inv.proyecto.nombre} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg">{inv.proyecto.nombre}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        {inv.proyecto.ubicacion}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                            inv.estado === "ESCROW"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-brand-500/10 text-brand-600 border border-brand-500/20"
                          )}
                        >
                          {inv.estado}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">ID: {inv.hashTransaccion?.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-brand-600">{inv.m2Comprados} m²</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">${inv.montoTotal.toLocaleString()} Invertidos</div>
                    <div className="text-xs text-emerald-500 font-bold mt-1">
                      Valor Actual: ${(inv.m2Comprados * (inv.proyecto.precioM2Mercado || inv.precioM2Aplicado)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {inversiones.length === 0 && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
                <p className="text-slate-500">Aún no tienes inversiones activas.</p>
              </div>
            )}
          </div>

          <InvestorMovementsTable movimientos={movimientos} />
        </div>

        {/* Opportunities Sidebar with Interactive Wizard */}
        <div id="oportunidades" className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Oportunidades de Fondeo</h2>
          <InvestmentContainer oportunidades={oportunidades} kycStatus={kycStatus} />
        </div>
      </div>
    </div>
  );
}
