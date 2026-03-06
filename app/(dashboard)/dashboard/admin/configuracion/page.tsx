"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Settings, Globe, Shield, MessageCircle, Database, CheckCircle, XCircle, Save } from "lucide-react";

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
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            {status
                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                : <XCircle className="w-4 h-4 text-rose-500" />}
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{label}</span>
            <span className={`text-[10px] font-black uppercase ml-auto ${status ? "text-emerald-500" : "text-rose-500"}`}>
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
        <div className="space-y-6 pb-12 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Settings className="w-7 h-7 text-brand-500" /> Configuración de Plataforma
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Ajustes globales del sistema</p>
                </div>
                <button onClick={handleSave} disabled={isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white font-bold shadow-glow hover:shadow-glow-lg transition-all disabled:opacity-50">
                    <Save className="w-4 h-4" /> Guardar Todo
                </button>
            </div>

            {/* Health Section */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-brand-500" /> Salud de Servicios
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ServiceHealth label="Base de Datos" status={health.db} />
                    <ServiceHealth label="Storage" status={health.storage} />
                    <ServiceHealth label="Pusher (Realtime)" status={health.pusher} />
                </div>
            </div>

            {/* Config Sections */}
            {CONFIG_SECTIONS.map(section => (
                <div key={section.title} className="glass-card p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <section.icon className="w-5 h-5 text-brand-500" /> {section.title}
                    </h2>
                    <div className="space-y-4">
                        {section.keys.map(({ key, label, type, options, default: def }) => (
                            <div key={key} className="flex items-center gap-4">
                                <label className="w-48 text-sm font-bold text-slate-500 shrink-0">{label}</label>
                                {type === "toggle" ? (
                                    <button
                                        onClick={() => updateKey(key, (config[key] || def) === "true" ? "false" : "true")}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${(config[key] || def) === "true" ? "bg-brand-500" : "bg-white/10"}`}>
                                        <span className={`absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all ${(config[key] || def) === "true" ? "left-[26px]" : "left-0.5"}`} />
                                    </button>
                                ) : type === "select" ? (
                                    <select value={config[key] || def} onChange={e => updateKey(key, e.target.value)}
                                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-900 dark:text-white">
                                        {options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input type={type === "password" ? "password" : "text"} value={config[key] || ""} onChange={e => updateKey(key, e.target.value)}
                                        placeholder={def}
                                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-900 dark:text-white" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
