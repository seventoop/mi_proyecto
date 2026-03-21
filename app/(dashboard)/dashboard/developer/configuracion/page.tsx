import { getSettings } from "@/lib/actions/settings";
import SettingsForm from "@/components/dashboard/settings/settings-form";
import ModuleHelp from "@/components/dashboard/module-help";
import { MODULE_HELP_CONTENT } from "@/config/dashboard/module-help-content";

export default async function SettingsPage() {
    const res = await getSettings();
    const settings = (res as any).data;

    // Default Fallback is handled in server action, but just in case
    const safeSettings = settings || {
        notifications: { emailLeads: true, emailReservas: true, pushSystem: true },
        appearance: { theme: "system", language: "es" },
        privacy: { showProfile: true }
    };

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
            <ModuleHelp content={MODULE_HELP_CONTENT.configuracion} />
            <SettingsForm initialSettings={safeSettings} />
        </div>
    );
}
