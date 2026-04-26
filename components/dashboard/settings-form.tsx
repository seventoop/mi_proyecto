"use client";

import { useState, useTransition } from "react";
import { Bell, Shield, Palette, Save, Loader2, Check, KeyRound, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { updateUserConfig } from "@/lib/actions/configuration";
import { requestPasswordSetup } from "@/lib/actions/auth-actions";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AccountInfo {
    email: string;
    hasPassword: boolean;
    hasGoogle: boolean;
    passwordUpdatedAt?: string | null;
}

interface SettingsFormProps {
    initialConfig?: any;
    account?: AccountInfo | null;
}

export default function SettingsForm({ initialConfig = {}, account = null }: SettingsFormProps) {
    const { theme, setTheme } = useTheme();
    const { data: session } = useSession();
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingPasswordEmail, startPasswordEmail] = useTransition();
    const [passwordEmailSent, setPasswordEmailSent] = useState(false);

    const handleRequestPasswordSetup = () => {
        startPasswordEmail(async () => {
            const res = await requestPasswordSetup();
            if (res.success) {
                setPasswordEmailSent(true);
                toast.success(res.message || "Email enviado");
            } else {
                toast.error(res.error || "No pudimos procesar la solicitud");
            }
        });
    };

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

            {/* Security */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 md:col-span-2 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                        <Shield className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Seguridad</h2>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <KeyRound className="w-4 h-4" />
                                Contraseña
                            </p>
                            {account ? (
                                account.hasPassword ? (
                                    <>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Tu cuenta ya tiene contraseña configurada{account.hasGoogle ? " y también podés iniciar sesión con Google." : "."} Para cambiarla, usá <span className="font-semibold">¿Olvidaste tu contraseña?</span> desde el login.
                                        </p>
                                        {account.passwordUpdatedAt && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Última actualización:{" "}
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {formatDistanceToNow(new Date(account.passwordUpdatedAt), { addSuffix: true, locale: es })}
                                                </span>
                                            </p>
                                        )}
                                    </>
                                ) : account.hasGoogle ? (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Hoy entrás solo con Google. Agregá una contraseña para poder iniciar sesión también con email + contraseña. Tu acceso con Google va a seguir funcionando.
                                    </p>
                                ) : (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Tu cuenta no tiene contraseña ni acceso con Google configurados. Contactá a soporte.
                                    </p>
                                )
                            ) : (
                                <p className="text-xs text-slate-500 mt-1">No pudimos cargar el estado de tu cuenta.</p>
                            )}
                        </div>

                        {account && !account.hasPassword && account.hasGoogle && !passwordEmailSent && (
                            <button
                                type="button"
                                onClick={handleRequestPasswordSetup}
                                disabled={isSendingPasswordEmail}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
                            >
                                {isSendingPasswordEmail ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Mail className="w-4 h-4" />
                                )}
                                Agregar contraseña a mi cuenta
                            </button>
                        )}
                    </div>

                    {passwordEmailSent && account && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                            Te enviamos un email a <span className="font-semibold">{account.email}</span> con un enlace para fijar tu contraseña. El enlace expira en 1 hora. Si no llega, revisá la carpeta de spam.
                        </div>
                    )}
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
