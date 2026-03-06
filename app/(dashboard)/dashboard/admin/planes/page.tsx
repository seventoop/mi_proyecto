"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Save, X, CreditCard, Users } from "lucide-react";

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
        <div className="space-y-8 pb-12 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestión de Planes</h1>
                    <p className="text-slate-500 font-medium mt-1">Administra planes SaaS y asignalos a organizaciones</p>
                </div>
                {!creating && !editing && (
                    <button onClick={() => { setCreating(true); setForm({ nombre: "", precio: 0, limites: defaultLimits, features: defaultFeatures }); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg transition-all">
                        <Plus className="w-4 h-4" /> Nuevo Plan
                    </button>
                )}
            </div>

            {/* Create/Edit Form */}
            {(creating || editing) && (
                <div className="glass-card p-6 space-y-4">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-white">{editing ? "Editar Plan" : "Crear Plan"}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                            <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Precio (USD/mes)</label>
                            <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: Number(e.target.value) })}
                                className="w-full mt-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-900 dark:text-white" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Límites</label>
                        <div className="grid grid-cols-4 gap-3">
                            {(["maxLeads", "maxProyectos", "maxUsers", "maxAutomations"] as const).map(k => (
                                <div key={k}>
                                    <label className="text-[10px] text-slate-400 capitalize">{k.replace("max", "Max ")}</label>
                                    <input type="number" value={form.limites[k]}
                                        onChange={e => setForm({ ...form, limites: { ...form.limites, [k]: Number(e.target.value) } })}
                                        className="w-full mt-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-900 dark:text-white" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Features</label>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(featureLabels).map(([k, label]) => (
                                <label key={k} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={(form.features as any)[k] ?? false}
                                        onChange={e => setForm({ ...form, features: { ...form.features, [k]: e.target.checked } })}
                                        className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-500" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSave} disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors disabled:opacity-50">
                            <Save className="w-4 h-4" /> Guardar
                        </button>
                        <button onClick={() => { setEditing(null); setCreating(false); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-400 font-bold hover:bg-white/10 transition-colors">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Plans Table */}
            <div className="glass-card overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/10 text-xs uppercase text-slate-500 font-black tracking-widest">
                        <th className="px-6 py-4 text-left">Plan</th>
                        <th className="px-6 py-4 text-left">Precio</th>
                        <th className="px-6 py-4 text-left">Limits</th>
                        <th className="px-6 py-4 text-left">Features</th>
                        <th className="px-6 py-4 text-center">Orgs</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {plans.map(plan => (
                            <tr key={plan.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{plan.nombre}</td>
                                <td className="px-6 py-4 text-emerald-500 font-bold">${plan.precio}/mo</td>
                                <td className="px-6 py-4 text-xs text-slate-400">
                                    {plan.limites.maxLeads}L · {plan.limites.maxProyectos}P · {plan.limites.maxUsers}U · {plan.limites.maxAutomations}A
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {Object.entries(plan.features).filter(([, v]) => v).map(([k]) => (
                                            <span key={k} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-500/10 text-brand-500 uppercase">{k}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{plan._count.orgs}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => startEdit(plan)} className="p-2 rounded-lg hover:bg-brand-500/10 text-brand-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(plan.id)} className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {plans.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">No hay planes creados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Organizations & Plan Assignment */}
            <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-brand-500" /> Organizaciones</h2>
                <table className="w-full">
                    <thead><tr className="border-b border-white/10 text-xs uppercase text-slate-500 font-black tracking-widest">
                        <th className="px-4 py-3 text-left">Organización</th>
                        <th className="px-4 py-3 text-left">Plan Actual</th>
                        <th className="px-4 py-3 text-center">Usuarios</th>
                        <th className="px-4 py-3 text-center">Proyectos</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                    </tr></thead>
                    <tbody>
                        {orgs.map(org => (
                            <tr key={org.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{org.nombre}</td>
                                <td className="px-4 py-3">
                                    {assigningOrg === org.id ? (
                                        <div className="flex gap-2 items-center">
                                            <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)}
                                                className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-900 dark:text-white">
                                                <option value="">Sin plan</option>
                                                {plans.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                            </select>
                                            <button onClick={handleAssignPlan} className="text-xs px-2 py-1 rounded-lg bg-brand-500 text-white font-bold">OK</button>
                                            <button onClick={() => setAssigningOrg(null)} className="text-xs text-slate-400">✕</button>
                                        </div>
                                    ) : (
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${org.planRef ? "bg-brand-500/10 text-brand-500" : "bg-white/5 text-slate-400"}`}>
                                            {org.planRef?.nombre || "FREE"}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500 font-bold">{org._count.users}</td>
                                <td className="px-4 py-3 text-center text-slate-500 font-bold">{org._count.proyectos}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => { setAssigningOrg(org.id); setSelectedPlanId(org.planRef?.id || ""); }}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-brand-500 hover:border-brand-500/30 font-bold transition-all">
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
