"use client";

import { useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { updateSystemConfig } from "@/lib/actions/configuration";
import { toast } from "sonner";

interface PlatformSettingsFormProps {
    initialConfig: {
        siteName: string;
        contactEmail: string;
        maintenanceMode: string;
    };
}

export default function PlatformSettingsForm({ initialConfig }: PlatformSettingsFormProps) {
    const [config, setConfig] = useState(initialConfig);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await (updateSystemConfig as any).updateBulk ?
                (updateSystemConfig as any).updateBulk(config) :
                await import("@/lib/actions/configuration").then(m => m.updateBulkSystemConfig(config));

            if (res.success) {
                toast.success("Configuración de plataforma actualizada");
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
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Nombre del Sitio</label>
                    <input
                        type="text"
                        value={config.siteName}
                        onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Email de Contacto</label>
                    <input
                        type="email"
                        value={config.contactEmail}
                        onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-900 dark:text-slate-300">Modo Mantenimiento</label>
                    <select
                        value={config.maintenanceMode}
                        onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-brand-500 transition-all"
                    >
                        <option value="false">Desactivado (Sitio Online)</option>
                        <option value="true">Activado (Sitio Offline)</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-70"
                >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
            </div>
        </div>
    );
}
