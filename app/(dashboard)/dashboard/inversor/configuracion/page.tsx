"use client";

import { useState, useEffect } from "react";
import SettingsForm from "@/components/dashboard/settings-form";
import { getUserConfig } from "@/lib/actions/configuration";
import { useSession } from "next-auth/react";

export default function InvestorConfigPage() {
    const { data: session } = useSession();
    const [userConfig, setUserConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            getUserConfig(session.user.id).then(res => {
                if (res.success) setUserConfig(res.data);
                setLoading(false);
            });
        }
    }, [session]);

    if (loading) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Configuración</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Preferencias de cuenta y notificaciones</p>
            </div>

            <SettingsForm initialConfig={userConfig} />
        </div>
    );
}
