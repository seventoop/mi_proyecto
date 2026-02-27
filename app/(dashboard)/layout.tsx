import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import DashboardContainer from "@/components/dashboard/dashboard-container";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black">
            <Sidebar />
            <DashboardContainer>
                <Header />
                <main className="p-6 overflow-x-hidden">{children}</main>
            </DashboardContainer>
        </div>
    );
}
