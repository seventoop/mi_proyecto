"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Key, MessageSquare } from "lucide-react";
import { updateSystemConfig } from "@/lib/actions/configuration";
import { toast } from "sonner";

interface SmartCrmSettingsFormProps {
    initialConfig: {
        openaiApiKey: string;
        whatsappProviderKey: string;
        automationLevel: string;
    };
}

export default function SmartCrmSettingsForm({ initialConfig }: SmartCrmSettingsFormProps) {
    const [config, setConfig] = useState(initialConfig);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { updateBulkSystemConfig } = await import("@/lib/actions/configuration");
            const res = await updateBulkSystemConfig({
                "OPENAI_API_KEY": config.openaiApiKey,
                "WHATSAPP_PROVIDER_KEY": config.whatsappProviderKey,
                "DEFAULT_AUTOMATION_LEVEL": config.automationLevel
            });

            if (res.success) {
                toast.success("Configuración de AI & WhatsApp actualizada");
            } else {
                toast.error(res.error || "Error al guardar la configuración");
            }
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-brand-orange" />
                        <h3 className="text-xs font-black text-brand-gray dark:text-brand-surface uppercase tracking-[0.2em]">API Keys & Integraciones</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-400">OpenAI API Key (GPT-4o)</label>
                        <input
                            type="password"
                            value={config.openaiApiKey}
                            onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
                            placeholder="sk-..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange/50 transition-all font-mono text-sm text-brand-surface"
                        />
                        <p className="text-[10px] text-slate-500 italic">Esta clave se usa para generar sugerencias del Copilot y analizar leads.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-400">WhatsApp Provider Solution (Sync Mode)</label>
                        <input
                            type="text"
                            value={config.whatsappProviderKey}
                            onChange={(e) => setConfig({ ...config, whatsappProviderKey: e.target.value })}
                            placeholder="ID de instancia o API Key de Evolution/Twilio"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange/50 transition-all text-sm text-brand-surface"
                        />
                        <p className="text-[10px] text-slate-500 italic">Requerido solo para el Modo Pilot (Automatización total). Actualmente en Beta.</p>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-brand-orange" />
                        <h3 className="text-xs font-black text-brand-gray dark:text-brand-surface uppercase tracking-[0.2em]">Políticas de Automatización</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-400">Nivel de Automatización Predeterminado</label>
                        <select
                            value={config.automationLevel}
                            onChange={(e) => setConfig({ ...config, automationLevel: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-brand-orange/50 transition-all text-sm cursor-pointer text-brand-surface"
                        >
                            <option value="DISABLED">Desactivado (Solo Manual)</option>
                            <option value="COPILOT">Sugerencias (Vendedor revisa y envía)</option>
                            <option value="PILOT">Pilot (IA responde y califica automáticamente)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-8 py-3 bg-brand-orange hover:bg-brand-orangeDark text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-brand-orange/20 transition-all disabled:opacity-70 active:scale-95"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? "Actualizando..." : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
}
