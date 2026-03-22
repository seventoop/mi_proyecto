import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import DashboardContainer from "@/components/dashboard/dashboard-container";
import SessionSyncHandler from "@/components/dashboard/session-sync-handler";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const initialRole = (session?.user as any)?.role ?? null;

    return (
        <div className="min-h-screen bg-white dark:bg-[#0A0A0C] selection:bg-brand-500/30">
            <SessionSyncHandler />
            <Sidebar initialRole={initialRole} />
            <DashboardContainer>
                <Header />
                <main className="p-4 sm:p-6 lg:p-8 xl:px-10 max-w-[1600px] mx-auto overflow-x-hidden pt-6">
                    {children}
                </main>
            </DashboardContainer>
        </div>
    );
}