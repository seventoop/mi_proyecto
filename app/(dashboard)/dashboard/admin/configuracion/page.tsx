"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Settings, Globe, Shield, MessageCircle, Database, CheckCircle, XCircle, Save } from "lucide-react";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

interface ConfigMap { [key: string]: string; }

const CONFIG_SECTIONS = [
    {
        title: "General", icon: Globe,
        keys: [
            { key: "PLATFORM_NAME", label: "Nombre de la plataforma", type: "text", default: "SevenToop" },
            { key: "SUPPORT_EMAIL", label: "Email de soporte", type: "email", default: "support@seventoop.com" },
            { key: "DEFAULT_LANGUAGE", label: "Idioma por defecto", type: "select", options: ["es", "en", "pt"], default: "es" },
            { key: "DEFAULT_THEME", label: "Tema por defecto", type: "select", options: ["light", "dark", "system"], default: "dark" },
        ],
    },
    {
        title: "Mantenimiento", icon: Shield,
        keys: [
            { key: "MAINTENANCE_MODE", label: "Modo mantenimiento", type: "toggle", default: "false" },
            { key: "SITE_ONLINE", label: "Sitio online", type: "toggle", default: "true" },
        ],
    },
    {
        title: "WhatsApp Business", icon: MessageCircle,
        keys: [
            { key: "WHATSAPP_API_KEY", label: "API Key", type: "password", default: "" },
            { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone Number ID", type: "text", default: "" },
            { key: "WHATSAPP_WEBHOOK_VERIFY_TOKEN", label: "Webhook Verify Token", type: "text", default: "" },
            { key: "WHATSAPP_WEBHOOK_SECRET", label: "Webhook Secret", type: "password", default: "" },
        ],
    },
    {
        title: "Contenido Landing", icon: Globe,
        keys: [
            { key: "HERO_TITLE", label: "Hero Title", type: "text", default: "Inversiones Inmobiliarias Inteligentes" },
            { key: "HERO_SUBTITLE", label: "Hero Subtitle", type: "text", default: "Descubrí oportunidades de inversión" },
            { key: "CTA_TEXT", label: "CTA Button Text", type: "text", default: "Comenzar ahora" },
        ],
    },
];

function ServiceHealth({ label, status }: { label: string; status: boolean }) {
    return (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
            {status
                ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                : <XCircle className="w-5 h-5 text-rose-500" />}
            <span className="text-sm font-black tracking-widest uppercase text-slate-300">{label}</span>
            <span className={`text-xs font-black uppercase ml-auto tracking-widest px-2.5 py-1 rounded-md ${status ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                {status ? "OK" : "ERROR"}
            </span>
        </div>
    );
}

export default function AdminConfiguracionPage() {
    const [config, setConfig] = useState<ConfigMap>({});
    const [isPending, startTransition] = useTransition();
    const [health, setHealth] = useState({ db: false, storage: false, pusher: false });

    useEffect(() => {
        fetch("/api/admin/config")
            .then(r => r.json())
            .then(data => { if (data.data) setConfig(data.data); });

        // Check health
        fetch("/api/admin/health")
            .then(r => r.json())
            .then(data => { if (data) setHealth(data); })
            .catch(() => { });
    }, []);

    const handleSave = () => {
        startTransition(async () => {
            const res = await fetch("/api/admin/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (data.success !== false) toast.success("Configuración guardada");
            else toast.error(data.error || "Error al guardar");
        });
    };

    const updateKey = (key: string, value: string) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                    <ModuleHelp content={MODULE_HELP_CONTENT.adminConfiguracion} />
                </div>
                <button onClick={handleSave} disabled={isPending}
                    className="mt-1 flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs uppercase font-black tracking-widest text-white transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50">
                    <Save className="w-4 h-4" /> Guardar Todo
                </button>
            </div>

            {/* Health Section */}
            <div className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6">
                <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-500" /> Salud de Servicios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ServiceHealth label="Base de Datos" status={health.db} />
                    <ServiceHealth label="Storage" status={health.storage} />
                    <ServiceHealth label="Pusher (Realtime)" status={health.pusher} />
                </div>
            </div>

            {/* Config Sections */}
            {CONFIG_SECTIONS.map(section => (
                <div key={section.title} className="bg-white dark:bg-[#0A0A0C] border border-white/[0.06] rounded-2xl p-6">
                    <h2 className="text-[12px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <section.icon className="w-4 h-4 text-brand-500" /> {section.title}
                    </h2>
                    <div className="space-y-5">
                        {section.keys.map(({ key, label, type, options, default: def }) => (
                            <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                <label className="w-48 text-xs font-black uppercase tracking-widest text-slate-500 shrink-0">{label}</label>
                                {type === "toggle" ? (
                                    <button
                                        onClick={() => updateKey(key, (config[key] || def) === "true" ? "false" : "true")}
                                        className={`w-12 h-6 rounded-full transition-colors relative border border-white/[0.06] ${(config[key] || def) === "true" ? "bg-brand-500" : "bg-white/[0.02]"}`}>
                                        <span className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${(config[key] || def) === "true" ? "left-[26px]" : "left-1"}`} />
                                    </button>
                                ) : type === "select" ? (
                                    <select value={config[key] || def} onChange={e => updateKey(key, e.target.value)}
                                        className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500/50">
                                        {options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input type={type === "password" ? "password" : "text"} value={config[key] || ""} onChange={e => updateKey(key, e.target.value)}
                                        placeholder={def}
                                        className="flex-1 px-4 py-2 rounded-xl bg-white dark:bg-[#0A0A0C] border border-white/[0.06] hover:border-white/[0.12] transition-colors text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-brand-500 focus:outline-none placeholder:text-slate-500/50" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
