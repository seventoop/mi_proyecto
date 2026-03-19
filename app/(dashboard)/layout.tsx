import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import DashboardContainer from "@/components/dashboard/dashboard-container";
import SessionSyncHandler from "@/components/dashboard/session-sync-handler";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A0C] selection:bg-brand-500/30">
            <SessionSyncHandler />
            <Sidebar />
            <DashboardContainer>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8 xl:px-10 max-w-[1600px] mx-auto overflow-x-hidden pt-6">
                    {children}
                </main>
            </DashboardContainer>
        </div>
    );
}