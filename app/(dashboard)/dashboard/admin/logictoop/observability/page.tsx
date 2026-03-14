import { ObservabilityDashboard } from "./observability-client";

export const metadata = {
    title: "LogicToop | Observabilidad"
};

export default function ObservabilityPage() {
    return (
        <div className="container max-w-7xl mx-auto py-8">
            <ObservabilityDashboard />
        </div>
    );
}
