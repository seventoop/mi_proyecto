import { ObservabilityDashboard } from "./observability-client";

export const metadata = {
    title: "LogicToop | Observabilidad"
};

export default function ObservabilityPage() {
    return (
        <div className="w-full py-8">
            <ObservabilityDashboard />
        </div>
    );
}
