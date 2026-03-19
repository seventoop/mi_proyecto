"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X, CreditCard, Users, LayoutTemplate } from "lucide-react";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

interface Plan {
    id: string;
    nombre: string;
    precio: number;
    limites: { maxLeads: number; maxProyectos: number; maxUsers: number; maxAutomations: number };
    features: { crm: boolean; banners: boolean; tour360: boolean; masterplan: boolean; inventario: boolean; workflows: boolean };
    _count: { orgs: number };
}

interface Org {
    id: string;
    nombre: string;
    slug: string;
    planRef: { id: string; nombre: string } | null;
    _count: { users: number; proyectos: number };
}

const defaultLimits = { maxLeads: 50, maxProyectos: 2, maxUsers: 3, maxAutomations: 1 };
const defaultFeatures = { crm: true, banners: false, tour360: false, masterplan: false, inventario: true, workflows: false };

export default function PlanesPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ nombre: "", precio: 0, limites: defaultLimits, features: defaultFeatures });
    const [isPending, startTransition] = useTransition();
    const [assigningOrg, setAssigningOrg] = useState<string | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    const fetchData = async () => {
        const [plansRes, orgsRes] = await Promise.all([
            fetch("/api/admin/plans").then(r => r.json()),
            fetch("/api/admin/orgs").then(r => r.json()),
        ]);
        if (plansRes.data) setPlans(plansRes.data);
        if (orgsRes.data) setOrgs(orgsRes.data);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        startTransition(async () => {
            const url = editing ? `/api/admin/plans/${editing}` : "/api/admin/plans";
            const method = editing ? "PUT" : "POST";
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            const data = await res.json();
            if (data.success !== false) {
                toast.success(editing ? "Plan actualizado" : "Plan creado");
                setEditing(null);
                setCreating(false);
                setForm({ nombre: "", precio: 0, limites: defaultLimits, features: defaultFeatures });
                fetchData();
            } else {
                toast.error(data.error || "Error");
            }
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar este plan?")) return;
        const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success !== false) {
            toast.success("Plan eliminado");
            fetchData();
        } else toast.error(data.error || "Error");
    };

    const handleAssignPlan = async () => {
        if (!assigningOrg) return;
        const res = await fetch(`/api/admin/orgs/${assigningOrg}/plan`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ planId: selectedPlanId || null }),
        });
        const data = await res.json();
        if (data.success !== false) {
            toast.success("Plan asignado");
            setAssigningOrg(null);
            fetchData();
        } else toast.error(data.error || "Error");
    };

    const startEdit = (plan: Plan) => {
        setEditing(plan.id);
        setCreating(false);
        setForm({ nombre: plan.nombre, precio: plan.precio, limites: plan.limites, features: plan.features });
    };

    const featureLabels: Record<string, string> = {
        crm: "CRM", banners: "Banners", tour360: "Tour 360", masterplan: "Masterplan", inventario: "Inventario", workflows: "Workflows",
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminPlanes} />
                </div>
                {!creating && !editing && (
                    <button onClick={() => { setCreating(true); setForm({ nombre: "", precio: 0, limites: defaultLimits, features: defaultFeatures }); }}
                        className="mt-1 flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-[10px] uppercase font-black tracking-widest text-white transition-all shadow-lg shadow-brand-500/20">
                        <Plus className="w-4 h-4" /> Nuevo Plan
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {(creating || editing) && (
                <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6 space-y-6">
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-brand-500" />
                        {editing ? "Editar Plan" : "Crear Plan"}
                    </h2>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre</label>
                            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className="w-full mt-2 px-4 py-2 bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-xl text-[12px] font-black uppercase tracking-tighter text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500/50" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Precio (USD/mes)</label>
                            <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: Number(e.target.value) })}
                                className="w-full mt-2 px-4 py-2 bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-xl text-[12px] font-black uppercase tracking-tighter text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500/50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Límites</label>
                        <div className="grid grid-cols-4 gap-4">
                            {(["maxLeads", "maxProyectos", "maxUsers", "maxAutomations"] as const).map(k => (
                                <div key={k}>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">{k.replace("max", "Max ")}</label>
                                    <input type="number" value={form.limites[k]}
                                        onChange={e => setForm({ ...form, limites: { ...form.limites, [k]: Number(e.target.value) } })}
                                        className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded-xl text-[12px] font-black uppercase tracking-tighter text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500/50" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Features</label>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(featureLabels).map(([k, label]) => (
                                <label key={k} className="flex items-center gap-2 cursor-pointer bg-white/[0.02] border border-white/[0.06] px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
                                    <input type="checkbox" checked={(form.features as any)[k] ?? false}
                                        onChange={e => setForm({ ...form, features: { ...form.features, [k]: e.target.checked } })}
                                        className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-black border-white/[0.12]" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-white/[0.06]">
                        <button onClick={handleSave} disabled={isPending}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                        <button onClick={() => { setEditing(null); setCreating(false); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.12] text-slate-400 font-bold uppercase tracking-widest text-[10px] hover:bg-white/[0.04] transition-colors">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Plans Table */}
            <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                        <tr className="text-[10px] uppercase text-slate-500 font-black tracking-widest">
                        <th className="px-6 py-4 text-left">Plan</th>
                        <th className="px-6 py-4 text-left">Precio</th>
                        <th className="px-6 py-4 text-left">Limits</th>
                        <th className="px-6 py-4 text-left">Features</th>
                        <th className="px-6 py-4 text-center">Orgs</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {plans.map(plan => (
                            <tr key={plan.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-[12px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{plan.nombre}</td>
                                <td className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-emerald-500">${plan.precio} / MES</td>
                                <td className="px-6 py-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">
                                    <span className="text-white">{plan.limites.maxLeads}</span> L · <span className="text-white">{plan.limites.maxProyectos}</span> P · <span className="text-white">{plan.limites.maxUsers}</span> U · <span className="text-white">{plan.limites.maxAutomations}</span> A
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(plan.features).filter(([, v]) => v).map(([k]) => (
                                            <span key={k} className="px-2 py-0.5 text-[9px] font-black tracking-widest rounded-md bg-brand-500/10 text-brand-500 uppercase">{k}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center text-[11px] font-black tracking-widest text-slate-900 dark:text-white">{plan._count.orgs}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => startEdit(plan)} className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-brand-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(plan.id)} className="p-2 rounded-xl hover:bg-white/[0.06] text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {plans.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">No hay planes creados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Organizations & Plan Assignment */}
            <div className="bg-[#0A0A0C] border border-white/[0.06] rounded-2xl overflow-hidden mt-6">
                <div className="p-6 border-b border-white/[0.06]">
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-brand-500" /> Asignación de Organizaciones
                    </h2>
                </div>
                <table className="w-full">
                    <thead className="bg-white/[0.02] border-b border-white/[0.06]"><tr className="text-[10px] uppercase text-slate-500 font-black tracking-widest">
                        <th className="px-6 py-4 text-left">Organización</th>
                        <th className="px-6 py-4 text-left">Plan Actual</th>
                        <th className="px-6 py-4 text-center">Usuarios</th>
                        <th className="px-6 py-4 text-center">Proyectos</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {orgs.map(org => (
                            <tr key={org.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4 text-[12px] font-black uppercase tracking-tighter text-slate-900 dark:text-white">{org.nombre}</td>
                                <td className="px-6 py-4">
                                    {assigningOrg === org.id ? (
                                        <div className="flex gap-2 items-center">
                                            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}
                                                className="px-3 py-1.5 rounded-xl bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white focus:outline-none">
                                                <option value="">SIN PLAN</option>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <button onClick={handleAssignPlan} className="text-[9px] px-3 py-1.5 rounded-lg bg-brand-500 text-white font-black uppercase tracking-widest hover:bg-brand-600">OK</button>
                                            <button onClick={() => setAssigningOrg(null)} className="text-[9px] px-3 py-1.5 text-slate-400 border border-white/[0.12] rounded-lg font-black uppercase tracking-widest hover:bg-white/[0.04]">✕</button>
                                        </div>
                                    ) : (
                                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase ${org.planRef ? "bg-brand-500/10 text-brand-500" : "bg-white/[0.06] text-slate-400"}`}>
                                            {org.planRef?.nombre || "FREE"}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400">{org._count.users}</td>
                                <td className="px-6 py-4 text-center text-[11px] font-black tracking-widest text-slate-500 dark:text-slate-400">{org._count.proyectos}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => { setAssigningOrg(org.id); setSelectedPlanId(org.planRef?.id || ""); }}
                                        className="text-[9px] px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:text-brand-500 hover:border-brand-500/30 hover:bg-white/[0.04] font-black uppercase tracking-widest transition-all">
                                        <CreditCard className="w-3 h-3 inline mr-1" /> Cambiar plan
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
