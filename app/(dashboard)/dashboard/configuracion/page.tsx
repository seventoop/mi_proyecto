import { Settings, Globe, Shield, Sparkles } from "lucide-react";
import SettingsForm from "@/components/dashboard/settings-form";
import { getAllSystemConfig, getUserConfig } from "@/lib/actions/configuration";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PlatformSettingsForm from "@/components/dashboard/platform-settings-form";
import SmartCrmSettingsForm from "@/components/dashboard/smart-crm-settings-form";

export default async function ConfiguracionPage() {
    const session = await getServerSession(authOptions);

    // Fetch Configs in Parallel on the Server
    const [configRes, userRes] = await Promise.all([
        getAllSystemConfig(),
        getUserConfig()
    ]);

    const configData = configRes.success && 'data' in configRes ? configRes.data : {} as Record<string, string>;
    const userData = userRes.success && 'data' in userRes ? userRes.data : null;

    const systemConfig = {
        siteName: configData?.["siteName"] || "Seventoop",
        contactEmail: configData?.["contactEmail"] || "admin@gention.com",
        maintenanceMode: configData?.["maintenanceMode"] || "false"
    };

    const smartCrmConfig = {
        openaiApiKey: configData?.["OPENAI_API_KEY"] || "",
        whatsappProviderKey: configData?.["WHATSAPP_PROVIDER_KEY"] || "",
        automationLevel: configData?.["DEFAULT_AUTOMATION_LEVEL"] || "COPILOT"
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Configuración</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Gestión administrativa y personalización</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Platform Settings */}
                    {(session?.user as any)?.role === "ADMIN" && (
                        <>
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plataforma</h2>
                                </div>
                                <PlatformSettingsForm initialConfig={systemConfig} />
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Smart CRM (AI & WhatsApp)</h2>
                                </div>
                                <SmartCrmSettingsForm initialConfig={smartCrmConfig} />
                            </div>
                        </>
                    )}

                    {/* Personal Settings */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-500">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Perfil Personal</h2>
                        </div>
                        <SettingsForm initialConfig={userData} />
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Integrations Status */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Servicios</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Base de Datos</span>
                                <div className="flex items-center gap-2 text-emerald-500 font-bold">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Conectado
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-xs uppercase font-bold text-slate-500 block mb-1">Almacenamiento</span>
                                <div className="flex items-center gap-2 text-amber-500 font-bold">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    Local
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
