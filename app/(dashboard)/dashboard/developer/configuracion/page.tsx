import { getSettings } from "@/lib/actions/settings";
import SettingsForm from "@/components/dashboard/settings/settings-form";

export default async function SettingsPage() {
    const { data: settings } = await getSettings();

    // Default Fallback is handled in server action, but just in case
    const safeSettings = settings || {
        notifications: { emailLeads: true, emailReservas: true, pushSystem: true },
        appearance: { theme: "system", language: "es" },
        privacy: { showProfile: true }
    };

    return (
        <div className="p-6 animate-fade-in">
            <SettingsForm initialSettings={safeSettings} />
        </div>
    );
}
