import { AutomationAnalyticsDashboard } from "./analytics-client";

export const metadata = {
    title: "LogicToop | Inteligencia de Automatización"
};

export default function AnalyticsPage() {
    return (
        <div className="container max-w-7xl mx-auto py-8">
            <AutomationAnalyticsDashboard />
        </div>
    );
}
