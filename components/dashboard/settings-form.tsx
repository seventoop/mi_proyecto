"use client";

import { useState } from "react";
import { Bell, Shield, Palette, Save, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { updateUserConfig } from "@/lib/actions/configuration";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface SettingsFormProps {
    initialConfig?: any;
}

export default function SettingsForm({ initialConfig = {} }: SettingsFormProps) {
    const { theme, setTheme } = useTheme();
    const { data: session } = useSession();
    const [isSaving, setIsSaving] = useState(false);

    // Merge defaults
    const [notifications, setNotifications] = useState({
        kyc: initialConfig?.notifications?.kyc ?? true,
        projects: initialConfig?.notifications?.projects ?? true,
        leads: initialConfig?.notifications?.leads ?? true,
        marketing: initialConfig?.notifications?.marketing ?? false,
    });
    const [whatsappNumber, setWhatsappNumber] = useState(initialConfig?.whatsappNumber || "");
    const [useAiCopilot, setUseAiCopilot] = useState(initialConfig?.useAiCopilot ?? true);
    const [aiAgentTone, setAiAgentTone] = useState(initialConfig?.aiAgentTone || "PROFESIONAL");

    const handleSave = async () => {
        if (!session?.user) return;
        setIsSaving(true);

        const newConfig = {
            notifications,
            whatsappNumber,
            useAiCopilot,
            aiAgentTone,
            // Theme is handled by next-themes locally, but we could sync it if we wanted
        };

        const res = await updateUserConfig(newConfig);

        setIsSaving(false);
        if (res.success) {
            toast.success("Configuración guardada correctamente");
        } else {
            toast.error("Error al guardar la configuración");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Notifications */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-full shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-brand-yellow/10 text-brand-yellow">
                        <Bell className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notificaciones</h2>
                </div>

                <div className="space-y-4 flex-1">
                    {[
                        { id: 'kyc', label: 'Actualizaciones de KYC' },
                        { id: 'projects', label: 'Nuevos proyectos/etapas' },
                        { id: 'leads', label: 'Alertas de actividad (Leads)' },
                        { id: 'marketing', label: 'Novedades y Marketing' }
                    ].map((item) => (
                        <label
                            key={item.id}
                            className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                        >
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications[item.id as keyof typeof notifications]}
                                    onChange={() => setNotifications(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof notifications] }))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-brand-orange/10 text-brand-orange">
                        <Palette className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Apariencia</h2>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Tema</label>
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            <button
                                onClick={() => setTheme("light")}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                                    theme === "light" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                Claro
                            </button>
                            <button
                                onClick={() => setTheme("dark")}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                                    theme === "dark" ? "bg-slate-700 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                Oscuro
                            </button>
                            <button
                                onClick={() => setTheme("system")}
                                className={cn(
                                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                                    theme === "system" ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                )}
                            >
                                Sistema
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-slate-300">WhatsApp Profesional</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                placeholder="+54 9 11 1234-5678"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-orange transition-all font-mono"
                            />
                            <p className="text-xs text-slate-500 mt-1">Este número se usará para contactar a tus leads.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Idioma</label>
                        <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white outline-none focus:border-brand-orange transition-all cursor-pointer">
                            <option>Español (ES)</option>
                            <option>English (EN) - Beta</option>
                            <option>Português (PT) - Beta</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Security Placeholder */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:col-span-2 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Seguridad</h2>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div>
                        <p className="font-bold text-slate-800 dark:text-white">Contraseña</p>
                        <p className="text-xs text-slate-500">Última actualización: hace 30 días</p>
                    </div>
                    <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        Cambiar
                    </button>
                </div>
            </div>

            <div className="md:col-span-2 flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-xl font-bold shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-70 disabled:grayscale"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? "Guardando..." : "Guardar Preferencias"}
                </button>
            </div>
        </div>
    );
}
