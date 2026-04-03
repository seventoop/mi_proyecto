import { AutomationAnalyticsDashboard } from "./analytics-client";

export const metadata = {
    title: "LogicToop | Inteligencia de Automatización"
};

export default function AnalyticsPage() {
    return (
        <div className="w-full py-8">
            <AutomationAnalyticsDashboard />
        </div>
    );
}
