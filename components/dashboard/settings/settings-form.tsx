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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Configuración</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Personaliza tu experiencia en la plataforma</p>
                </div>
                <Button onClick={onSubmit} disabled={isLoading} className="bg-brand-orange hover:bg-brand-orangeDark text-white min-w-[120px]">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue="notifications" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
                        <Bell className="w-4 h-4 mr-2" /> Notificaciones
                    </TabsTrigger>
                    <TabsTrigger value="general" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
                        <Globe className="w-4 h-4 mr-2" /> General
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
                        <Shield className="w-4 h-4 mr-2" /> Privacidad
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="notifications">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle>Preferencias de Notificación</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                Elige cómo y cuándo quieres que te contactemos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="emailLeads" className="flex flex-col space-y-1">
                                    <span>Nuevos Leads</span>
                                    <span className="font-normal text-xs text-slate-500 dark:text-slate-400">Recibir un email cuando se asigne un nuevo lead.</span>
                                </Label>
                                <Switch
                                    id="emailLeads"
                                    checked={settings.notifications.emailLeads}
                                    onCheckedChange={() => handleToggle("notifications", "emailLeads")}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="emailReservas" className="flex flex-col space-y-1">
                                    <span>Nuevas Reservas</span>
                                    <span className="font-normal text-xs text-slate-500 dark:text-slate-400">Recibir un email cuando se cree una reserva.</span>
                                </Label>
                                <Switch
                                    id="emailReservas"
                                    checked={settings.notifications.emailReservas}
                                    onCheckedChange={() => handleToggle("notifications", "emailReservas")}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="pushSystem" className="flex flex-col space-y-1">
                                    <span>Notificaciones del Sistema</span>
                                    <span className="font-normal text-xs text-slate-500 dark:text-slate-400">Avisos importantes sobre mantenimiento o actualizaciones.</span>
                                </Label>
                                <Switch
                                    id="pushSystem"
                                    checked={settings.notifications.pushSystem}
                                    onCheckedChange={() => handleToggle("notifications", "pushSystem")}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="general">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle>Apariencia y Lenguaje</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                Ajusta la interfaz a tus preferencias.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Tema</Label>
                                <div className="flex gap-4">
                                    <Button
                                        variant={settings.appearance.theme === "light" ? "default" : "outline"}
                                        className={`flex-1 ${settings.appearance.theme === "light" ? "bg-brand-orange text-white border-0" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "light")}
                                    >
                                        <Sun className="w-4 h-4 mr-2" /> Claro
                                    </Button>
                                    <Button
                                        variant={settings.appearance.theme === "dark" ? "default" : "outline"}
                                        className={`flex-1 ${settings.appearance.theme === "dark" ? "bg-brand-orange text-white border-0" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "dark")}
                                    >
                                        <Moon className="w-4 h-4 mr-2" /> Oscuro
                                    </Button>
                                    <Button
                                        variant={settings.appearance.theme === "system" ? "default" : "outline"}
                                        className={`flex-1 ${settings.appearance.theme === "system" ? "bg-brand-orange text-white border-0" : "bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"}`}
                                        onClick={() => handleSelect("appearance", "theme", "system")}
                                    >
                                        <span className="mr-2">🖥️</span> Sistema
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Idioma</Label>
                                <Select
                                    value={settings.appearance.language}
                                    onValueChange={(val) => handleSelect("appearance", "language", val)}
                                >
                                    <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                        <SelectValue placeholder="Seleccionar idioma" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                        <SelectItem value="es">Español</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="privacy">
                    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        <CardHeader>
                            <CardTitle>Privacidad y Seguridad</CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400">
                                Gestiona la visibilidad de tu información.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="showProfile" className="flex flex-col space-y-1">
                                    <span>Perfil Público</span>
                                    <span className="font-normal text-xs text-slate-500 dark:text-slate-400">Permitir que otros usuarios vean mi información de contacto básica.</span>
                                </Label>
                                <Switch
                                    id="showProfile"
                                    checked={settings.privacy.showProfile}
                                    onCheckedChange={() => handleToggle("privacy", "showProfile")}
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <Label className="text-rose-400">Zona de Peligro</Label>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 mb-3">Acciones irreversibles sobre tu cuenta.</p>
                                <Button variant="destructive" size="sm">Cerrar Sesión en todos los dispositivos</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
