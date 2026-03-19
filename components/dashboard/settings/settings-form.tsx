"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSettings } from "@/lib/actions/settings";
import { toast } from "sonner";
import { Loader2, Moon, Sun, Bell, Shield, Globe } from "lucide-react";

type SettingsType = {
    notifications: {
        emailLeads: boolean;
        emailReservas: boolean;
        pushSystem: boolean;
    };
    appearance: {
        theme: "light" | "dark" | "system";
        language: "es" | "en";
    };
    privacy: {
        showProfile: boolean;
    };
};

export default function SettingsForm({ initialSettings }: { initialSettings: SettingsType }) {
    const [settings, setSettings] = useState<SettingsType>(initialSettings);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = (section: keyof SettingsType, key: string) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: !((prev[section] as any)[key])
            }
        }));
    };

    const handleSelect = (section: keyof SettingsType, key: string, value: string) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const onSubmit = async () => {
        setIsLoading(true);
        const res = await updateSettings(settings);
        setIsLoading(false);

        if (res.success) {
            toast.success("Configuración guardada exitosamente");
        } else {
            toast.error("Error al guardar configuración");
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-end items-center mb-2">
                <Button onClick={onSubmit} disabled={isLoading} className="bg-brand-500 hover:bg-brand-600 text-white min-w-[120px] rounded-xl shadow-lg shadow-brand-500/20 font-black uppercase text-[11px] tracking-tight">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="notifications" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-1 h-auto rounded-xl">
                    <TabsTrigger value="notifications" className="py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.04] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors">
                        <Bell className="w-4 h-4 mr-2" /> Notificaciones
                    </TabsTrigger>
                    <TabsTrigger value="general" className="py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.04] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors">
                        <Globe className="w-4 h-4 mr-2" /> General
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-white/[0.04] data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-colors">
                        <Shield className="w-4 h-4 mr-2" /> Privacidad
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="notifications" className="mt-6">
                    <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
                        <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                            <CardTitle className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Preferencias de Notificación</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                                Elige cómo y cuándo quieres que te contactemos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.01] rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/[0.04] transition-all">
                                <Label htmlFor="emailLeads" className="flex flex-col space-y-1.5 cursor-pointer">
                                    <span className="text-[12px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">Nuevos Leads</span>
                                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/30">Recibir un email cuando se asigne un nuevo lead.</span>
                                </Label>
                                <Switch id="emailLeads" checked={settings.notifications.emailLeads} onCheckedChange={() => handleToggle("notifications", "emailLeads")} />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.01] rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/[0.04] transition-all">
                                <Label htmlFor="emailReservas" className="flex flex-col space-y-1.5 cursor-pointer">
                                    <span className="text-[12px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">Nuevas Reservas</span>
                                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/30">Recibir un email cuando se cree una reserva.</span>
                                </Label>
                                <Switch id="emailReservas" checked={settings.notifications.emailReservas} onCheckedChange={() => handleToggle("notifications", "emailReservas")} />
                            </div>
                            <div className="flex items-center justify-between space-x-2 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.01] rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/[0.04] transition-all">
                                <Label htmlFor="pushSystem" className="flex flex-col space-y-1.5 cursor-pointer">
                                    <span className="text-[12px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">Notif. del Sistema</span>
                                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/30">Mantenimiento o actualizaciones del sistema.</span>
                                </Label>
                                <Switch id="pushSystem" checked={settings.notifications.pushSystem} onCheckedChange={() => handleToggle("notifications", "pushSystem")} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general" className="mt-6">
                    <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
                        <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                            <CardTitle className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Apariencia y Lenguaje</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                                Ajusta la interfaz a tus preferencias.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4 px-3">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Tema visual</Label>
                                <div className="flex gap-4">
                                    <Button
                                        variant={settings.appearance.theme === "light" ? "default" : "outline"}
                                        className={`flex-1 rounded-xl h-12 text-xs font-black uppercase tracking-tight transition-all ${settings.appearance.theme === "light" ? "bg-brand-500 text-white border-0 shadow-lg shadow-brand-500/20" : "bg-transparent border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] dark:hover:bg-white/[0.01] text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "light")}
                                    >
                                        <Sun className="w-4 h-4 mr-2" /> Claro
                                    </Button>
                                    <Button
                                        variant={settings.appearance.theme === "dark" ? "default" : "outline"}
                                        className={`flex-1 rounded-xl h-12 text-xs font-black uppercase tracking-tight transition-all ${settings.appearance.theme === "dark" ? "bg-brand-500 text-white border-0 shadow-lg shadow-brand-500/20" : "bg-transparent border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] dark:hover:bg-white/[0.01] text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "dark")}
                                    >
                                        <Moon className="w-4 h-4 mr-2" /> Oscuro
                                    </Button>
                                    <Button
                                        variant={settings.appearance.theme === "system" ? "default" : "outline"}
                                        className={`flex-1 rounded-xl h-12 text-xs font-black uppercase tracking-tight transition-all ${settings.appearance.theme === "system" ? "bg-brand-500 text-white border-0 shadow-lg shadow-brand-500/20" : "bg-transparent border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] dark:hover:bg-white/[0.01] text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "system")}
                                    >
                                        <span className="mr-2">🖥️</span> Sistema
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4 px-3">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">Idioma de la plataforma</Label>
                                <Select value={settings.appearance.language} onValueChange={(val) => handleSelect("appearance", "language", val)}>
                                    <SelectTrigger className="w-full h-12 rounded-xl bg-slate-50 dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] hover:dark:border-white/[0.12] transition-colors focus:ring-brand-500 text-[12px] font-bold uppercase tracking-tight">
                                        <SelectValue placeholder="Seleccionar idioma" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] rounded-xl shadow-lg">
                                        <SelectItem value="es" className="text-[11px] font-bold uppercase tracking-widest cursor-pointer focus:bg-slate-50 dark:focus:bg-white/[0.04]">Español</SelectItem>
                                        <SelectItem value="en" className="text-[11px] font-bold uppercase tracking-widest cursor-pointer focus:bg-slate-50 dark:focus:bg-white/[0.04]">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="privacy" className="mt-6">
                    <Card className="bg-white dark:bg-[#0A0A0C] border-slate-200 dark:border-white/[0.06] text-slate-900 dark:text-white rounded-2xl shadow-none">
                        <CardHeader className="pb-6 border-b border-slate-100 dark:border-white/[0.06] mb-6">
                            <CardTitle className="text-[13px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Privacidad y Seguridad</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mt-2">
                                Gestiona la visibilidad de tu información.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2 p-3 hover:bg-slate-50 dark:hover:bg-white/[0.01] rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/[0.04] transition-all">
                                <Label htmlFor="showProfile" className="flex flex-col space-y-1.5 cursor-pointer">
                                    <span className="text-[12px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">Perfil Público</span>
                                    <span className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/30">Permitir que otros vean mi información básica.</span>
                                </Label>
                                <Switch id="showProfile" checked={settings.privacy.showProfile} onCheckedChange={() => handleToggle("privacy", "showProfile")} />
                            </div>
                            <div className="pt-8 mt-2 border-t border-slate-200 dark:border-white/[0.06] px-3">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-rose-500 mb-2 block">Zona de Peligro</Label>
                                <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 dark:text-white/30 mb-6">Acciones irreversibles sobre tu cuenta en SevenToop.</p>
                                <Button variant="destructive" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-tight hover:bg-rose-600 transition-colors">
                                    Cerrar Sesión Global
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
